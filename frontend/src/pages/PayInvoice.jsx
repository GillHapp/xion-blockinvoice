import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@burnt-labs/abstraxion";
import { CONTRACTS } from "../utils/constants";

const PayInvoice = () => {
    const [invoiceId, setInvoiceId] = useState("");
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState("");

    const { data: { bech32Address }, isConnected } = useAbstraxionAccount();
    const { client } = useAbstraxionSigningClient();

    const fetchInvoice = async () => {
        if (!invoiceId) {
            setPaymentStatus("Invoice ID is required.");
            return;
        }

        setLoading(true);
        setPaymentStatus("");

        try {
            const query = {
                GetInvoice: {
                    invoice_id: parseInt(invoiceId),
                },
            };

            const response = await client.queryContractSmart(CONTRACTS.Invoice, query);
            setInvoiceDetails(response);
            setPaymentStatus("Invoice fetched successfully.");
        } catch (error) {
            console.error("Error fetching invoice:", error);
            setPaymentStatus("Failed to fetch invoice. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const payInvoice = async () => {
        if (!invoiceDetails) {
            setPaymentStatus("No invoice details available.");
            return;
        }

        if (!isConnected) {
            setPaymentStatus("Wallet not connected.");
            return;
        }

        if (invoiceDetails.is_paid) {
            setPaymentStatus("Invoice is already paid.");
            return;
        }

        try {
            setLoading(true);
            setPaymentStatus("Processing payment...");

            const msg = {
                PayInvoice: {
                    invoice_id: parseInt(invoiceId),
                },
            };

            const funds = [
                {
                    denom: "uxion",
                    amount: invoiceDetails.amount,
                },
            ];

            const response = await client.execute(
                bech32Address,
                CONTRACTS.Invoice,
                msg,
                "auto",
                "",
                funds
            );

            console.log("Payment response:", response);
            setPaymentStatus("Payment successful!");
        } catch (error) {
            console.error("Error during payment:", error);
            setPaymentStatus("Payment failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Link to="/" className="absolute left-0 top-0 bg-green-500 text-white rounded-md px-3 py-3 m-5">
                Return Home
            </Link>
            <h2 className="text-2xl font-semibold mb-6">Pay Invoice</h2>

            {isConnected ? (
                <p className="text-lg mb-4">
                    <strong>Connected Wallet Address: </strong>
                    {bech32Address}
                </p>
            ) : (
                <p className="text-red-500">Please connect your wallet to proceed.</p>
            )}

            <input
                type="text"
                className="w-full max-w-md p-3 rounded-md border border-gray-300"
                placeholder="Enter Invoice ID"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
            />
            <button
                className="mt-4 bg-blue-500 text-white py-3 px-6 rounded-md"
                onClick={fetchInvoice}
                disabled={loading}
            >
                {loading ? "Fetching..." : "Fetch Invoice"}
            </button>

            {invoiceDetails && (
                <div className="mt-6 space-y-4">
                    <p><strong>Amount:</strong> {invoiceDetails.amount} uxion</p>
                    <p><strong>Recipient:</strong> {invoiceDetails.recipient}</p>
                    <p><strong>Due Date:</strong> {new Date(invoiceDetails.due_date).toLocaleString()}</p>
                    <p><strong>Status:</strong> {invoiceDetails.is_paid ? "Paid" : "Unpaid"}</p>
                    {!invoiceDetails.is_paid && (
                        <button
                            className="mt-4 bg-green-500 text-white py-3 px-6 rounded-md"
                            onClick={payInvoice}
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Pay Now"}
                        </button>
                    )}
                </div>
            )}

            {paymentStatus && (
                <div className="mt-6 text-center text-lg text-red-500">
                    <p>{paymentStatus}</p>
                </div>
            )}
        </div>
    );
};

export default PayInvoice;
