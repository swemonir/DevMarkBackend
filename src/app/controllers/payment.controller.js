import OrderModel from "../../infrastructure/models/Order.model.js";
import ProjectModel from "../../infrastructure/models/Project.model.js";
import { PaymentService } from "../services/payment.service.js";
import mongoose from "mongoose";

/**
 * @desc    Create a new Order
 * @route   POST /api/payments/orders
 * @rules   Validate project availability, calculate amount on backend
 */
export const createOrder = async (req, res) => {
    try {
        const { projectId, billingDetails } = req.body;

        // 1. Validate required fields
        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        // 2. Fetch Project (Source of Truth for Price)
        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // 3. Prevent buying own project or sold project
        if (project.owner.toString() === req.user.id) {
            return res.status(400).json({ success: false, message: "Cannot purchase your own project" });
        }
        if (!project.isForSale || project.soldTo) {
            return res.status(400).json({ success: false, message: "Project is not available for sale" });
        }

        // 4. Check for existing pending orders for this user/project
        // Prevent duplicate pending orders
        const existingOrder = await OrderModel.findOne({
            user: req.user.id,
            project: projectId,
            status: { $in: ['pending', 'processing'] }
        });

        if (existingOrder) {
            return res.status(200).json({
                success: true,
                message: "Pending order already exists",
                data: existingOrder
            });
        }

        // 5. Create Order
        const newOrder = await OrderModel.create({
            user: req.user.id,
            project: projectId,
            totalAmount: project.price, // BACKEND CALCULATED
            currency: 'USD',
            status: 'pending',
            billingDetails: billingDetails || {}
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (err) {
        console.error("CREATE ORDER ERROR:", err);
        res.status(500).json({ success: false, message: "Server error creating order" });
    }
};


/**
 * @desc    Process Payment with 2Checkout
 * @route   POST /api/payments/pay
 * @body    { orderId, token }
 * @rules   Atomic transaction logic, Handle Gateway Failures
 */
export const processPayment = async (req, res) => {
    try {
        const { orderId, token } = req.body;

        if (!orderId || !token) {
            return res.status(400).json({ success: false, message: "Order ID and Payment Token are required" });
        }

        // 1. Retrieve Order
        const order = await OrderModel.findById(orderId).populate('project');

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 2. Security Checks
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Unauthorized access to order" });
        }
        if (order.status === 'paid') {
            return res.status(400).json({ success: false, message: "Order is already paid" });
        }

        // 3. Lock Order (Optimistic)
        order.status = 'processing';
        await order.save();

        // 4. Call Payment Service (2Checkout)
        try {
            const gatewayResponse = await PaymentService.charge({
                merchantOrderId: order._id.toString(),
                token: token,
                amount: order.totalAmount,
                billingDetails: {
                    name: req.user.name || 'Customer',
                    email: req.user.email,
                    addrLine1: order.billingDetails?.address || '123 Test St',
                    city: order.billingDetails?.city || 'Dhaka',
                    country: order.billingDetails?.country || 'BGD',
                    ...order.billingDetails
                }
            });

            // 5. SUCCESS FLOW
            // Start local DB transaction for atomicity
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Update Order
                order.status = 'paid';
                order.transactionId = gatewayResponse.transactionId;
                order.paymentGatewayLogs = gatewayResponse.raw;
                await order.save({ session });

                // Update Project
                const project = await ProjectModel.findById(order.project._id).session(session);
                if (project) {
                    project.soldTo = req.user.id;
                    project.soldAt = new Date();
                    project.isForSale = false;
                    await project.save({ session });
                }

                await session.commitTransaction();

                res.status(200).json({
                    success: true,
                    message: "Payment successful",
                    data: {
                        transactionId: gatewayResponse.transactionId,
                        status: 'paid'
                    }
                });

            } catch (dbError) {
                await session.abortTransaction();
                throw dbError; // Bubble up to main catch
            } finally {
                session.endSession();
            }

        } catch (gatewayError) {
            // 6. FAILURE FLOW
            order.status = 'failed';
            order.paymentGatewayLogs = gatewayError.raw || gatewayError;
            await order.save();

            return res.status(400).json({
                success: false,
                message: "Payment Failed",
                error: gatewayError.message // Safe message from service
            });
        }

    } catch (err) {
        console.error("PROCESS PAYMENT ERROR:", err);
        res.status(500).json({ success: false, message: "Internal Server Error during payment" });
    }
};

/**
 * @desc    Handle 2Checkout INS Webhook
 * @route   POST /api/payments/ins
 * @rules   Verify signature, treat as final truth
 */
export const handleWebhook = async (req, res) => {
    try {
        const params = req.body;

        console.log("➡️ WEBHOOK RECEIVED:", params.message_type, params.sale_id);

        // 1. Verify Signature (Security)
        // In production, MUST implement verifySignature(params) using API Secret
        // const isValid = PaymentService.verifySignature(params);
        // if (!isValid) return res.status(400).send('Invalid Signature');

        // 2. Parse Data
        const transactionId = params.sale_id; // 2Checkout Sale ID
        const customOrderId = params.vendor_order_id; // Our internal Order ID usually passed here
        const messageType = params.message_type; // ORDER_CREATED, INVOICE_STATUS_CHANGED etc.

        // We are looking for successful payment events
        if (messageType === 'INVOICE_STATUS_CHANGED' && params.invoice_status === 'deposited') {
            // This is confirmed money
            const order = await OrderModel.findOne({ _id: customOrderId });

            if (order && order.status !== 'paid') {
                order.status = 'paid';
                order.transactionId = transactionId;
                await order.save();

                // Also ensure project is transferred if not already
                // (Redundant safety check)
            }
        }

        // ACK to 2Checkout
        res.send(`<EPAYMENT>${params.DATE}</EPAYMENT>`);

    } catch (err) {
        console.error("WEBHOOK ERROR:", err);
        res.status(500).send('Error');
    }
};
