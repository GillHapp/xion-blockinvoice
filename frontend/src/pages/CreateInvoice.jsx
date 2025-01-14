import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    useAbstraxionAccount,
    useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { CONTRACTS, TREASURY } from "../utils/constants";

async function write(client, msg, sender, contract) {
    if (!client) return;
    return client.execute(
        sender,
        contract,
        msg,
        "auto",
        "",
        []
    );
}

const CreateInvoice = () => {
    // State variables
    const [payer, setPayer] = useState(""); // Payer's address
    const [description, setDescription] = useState(""); // Invoice description
    const [dueDate, setDueDate] = useState(""); // Due date
    const [items, setItems] = useState([{ itemName: "", itemPrice: "" }]); // Invoice items
    const [totalAmount, setTotalAmount] = useState(0); // Total amount
    const [invoiceId, setInvoiceId] = useState(""); // Invoice ID after creation
    const [status, setStatus] = useState(""); // Status messages

    const { data: { bech32Address }, isConnected } = useAbstraxionAccount();
    const { client } = useAbstraxionSigningClient();

    // Handle input changes for item and price
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...items];
        updatedItems[index][field] = value;

        // Update items state
        setItems(updatedItems);

        // Recalculate the total amount
        const newTotal = updatedItems.reduce((acc, item) => acc + parseFloat(item.itemPrice || 0), 0);
        setTotalAmount(newTotal);
    };

    // Add a new item row
    const handleAddItem = () => {
        if (items.length < 5) {
            setItems([...items, { itemName: "", itemPrice: "" }]);
        }
    };

    // Remove an item row
    const handleRemoveItem = (index) => {
        const updatedItems = items.filter((_, i) => i !== index);
        setItems(updatedItems);

        // Recalculate the total amount after removal
        const newTotal = updatedItems.reduce((acc, item) => acc + parseFloat(item.itemPrice || 0), 0);
        setTotalAmount(newTotal);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("Creating invoice...");

        try {
            if (!client || !bech32Address) {
                throw new Error("Wallet not connected or client unavailable.");
            }

            if (!payer || !description || !dueDate) {
                throw new Error("All fields are required.");
            }
            if (totalAmount <= 0) {
                throw new Error("Total amount must be greater than 0.");
            }

            const msg = {
                create_invoice: {
                    recipient: payer.toLowerCase(),
                    amount: totalAmount.toString(),
                    description,
                    due_date: new Date(dueDate).getTime(),
                },
            };

            console.log("Sending transaction with message:", msg);

            const res = await client.execute(
                bech32Address,
                CONTRACTS.Invoice,
                msg,
                {
                    amount: [{ amount: "100", denom: "uxion" }],
                    gas: "500000",
                    granter: TREASURY.treasury
                },
                "",
                []
            );

            console.log("Transaction response:", res);

            // Extract the invoice ID from the response
            const invoiceId = res.logs[0].events[0].attributes.find(attr => attr.key === "invoice_id").value;
            setInvoiceId(invoiceId);
            setStatus("Invoice created successfully!");

        } catch (err) {
            console.error("Error creating invoice:", err);

            // Inspect the error for more details
            if (err.response) {
                console.error("Response:", err.response);
            }
            setStatus(`Error creating invoice: ${err.message}`);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Link to="/" className="absolute left-0 top-0 bg-green-500 text-white rounded-md px-3 py-3 m-5">
                Return Home
            </Link>
            <h2 className="text-2xl font-semibold mb-6">Create an Invoice</h2>

            {isConnected ? (
                <p>Connected Wallet (Issuer): {bech32Address}</p>
            ) : (
                <p>No wallet connected</p>
            )}

            <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
                {/* Payer Address */}
                <input
                    type="text"
                    className="w-full p-3 rounded-md border border-gray-300"
                    placeholder="Payer Address"
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                />

                {/* Description */}
                <textarea
                    className="w-full p-3 rounded-md border border-gray-300"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                {/* Due Date */}
                <input
                    type="date"
                    className="w-full p-3 rounded-md border border-gray-300"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                />

                {/* Items and Prices */}
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-4">
                            <input
                                type="text"
                                className="w-full p-3 rounded-md border border-gray-300"
                                placeholder={`Item ${index + 1}`}
                                value={item.itemName}
                                onChange={(e) =>
                                    handleItemChange(index, "itemName", e.target.value)
                                }
                            />
                            <input
                                type="number"
                                className="w-full p-3 rounded-md border border-gray-300"
                                placeholder="Price"
                                value={item.itemPrice}
                                onChange={(e) =>
                                    handleItemChange(index, "itemPrice", e.target.value)
                                }
                            />
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    className="text-red-500"
                                    onClick={() => handleRemoveItem(index)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="w-full bg-gray-300 text-gray-800 py-2 rounded-md mt-4"
                    onClick={handleAddItem}
                >
                    Add Item
                </button>

                {/* Total Amount */}
                <div className="mt-4 text-lg font-semibold">
                    <p>Total Amount: ${totalAmount.toFixed(2)}</p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-black py-3 rounded-md mt-6"
                >
                    Create Invoice
                </button>
            </form>

            {/* Status and Invoice Details */}
            {status && <p className="mt-4 text-center text-red-500">{status}</p>}
            {invoiceId && (
                <div className="mt-6 text-center">
                    <p>Invoice Created! Invoice ID: {invoiceId}</p>
                </div>
            )}
        </div>
    );
};

export default CreateInvoice;
