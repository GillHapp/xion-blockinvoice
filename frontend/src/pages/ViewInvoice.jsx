import { useState } from "react";
import { Link } from "react-router-dom";
import { useAbstraxionSigningClient } from "@burnt-labs/abstraxion";
import { CONTRACTS } from "../utils/constants";

const ViewInvoice = () => {
    const [invoiceId, setInvoiceId] = useState("");
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [status, setStatus] = useState("");

    const { client } = useAbstraxionSigningClient();

    const handleFetchInvoice = async () => {
        if (!invoiceId) {
            setStatus("Please enter a valid Invoice ID.");
            return;
        }

        if (!client) {
            setStatus("Blockchain client is not connected.");
            return;
        }

        try {
            setStatus("Fetching invoice...");
            const query = {
                GetInvoice: {
                    invoice_id: parseInt(invoiceId),
                },
            };

            const response = await client.queryContractSmart(CONTRACTS.Invoice, query);

            setInvoiceDetails({
                amount: `${response.amount} uxion`,
                description: response.description,
                dueDate: new Date(response.due_date * 1000).toLocaleString(),
                status: response.is_paid ? "Paid" : "Unpaid",
            });

            setStatus("Invoice fetched successfully.");
        } catch (error) {
            console.error("Error fetching invoice:", error);
            setStatus("Failed to fetch the invoice. Please ensure the ID is correct and try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Link to="/" className="absolute left-0 top-0 bg-green-500 text-white rounded-md px-3 py-3 m-5">
                Return Home
            </Link>
            <h2 className="text-2xl font-semibold mb-6">View Invoice</h2>
            <input
                type="text"
                className="w-full max-w-md p-3 rounded-md border border-gray-300"
                placeholder="Enter Invoice ID"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
            />
            <button
                className="mt-4 bg-green-500 text-white py-3 px-6 rounded-md"
                onClick={handleFetchInvoice}
            >
                Fetch Invoice
            </button>

            {status && (
                <div className="mt-4 text-lg text-center text-blue-500">
                    <p>{status}</p>
                </div>
            )}

            {invoiceDetails && (
                <div className="mt-6 space-y-4 p-6 bg-white rounded-lg shadow-lg">
                    <p>
                        <strong>Amount:</strong> {invoiceDetails.amount}
                    </p>
                    <p>
                        <strong>Description:</strong> {invoiceDetails.description}
                    </p>
                    <p>
                        <strong>Due Date:</strong> {invoiceDetails.dueDate}
                    </p>
                    <p>
                        <strong>Status:</strong> {invoiceDetails.status}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ViewInvoice;
