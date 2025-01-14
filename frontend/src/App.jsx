import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CreateInvoice from "./pages/CreateInvoice";
import ViewInvoice from "./pages/ViewInvoice";
import PayInvoice from "./pages/PayInvoice";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import { ToastContainer } from "react-toastify";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Abstraxion,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useModal,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import PayInvoiceQr from "./pages/PayInvoiceQr";

const seatContractAddress =
  "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka";

function App() {
  // Abstraxion hooks
  const { data: account, isConnected, isConnecting } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const [, setShow] = useModal();

  // local hooks
  const [walletAddress, setWalletAddress] = useState("");
  const [networkError, setNetworkError] = useState("");
  const NETWORK_ID = "0x103D"; // CrossFi Testnet Chain ID

  const [loading, setLoading] = useState(false);
  const [executeResult, setExecuteResult] = useState(undefined);

  const blockExplorerUrl = executeResult
    ? `https://explorer.burnt.com/xion-testnet-1/tx/${executeResult?.transactionHash}`
    : "";

  async function claimSeat() {
    setLoading(true);

    const now = new Date();
    now.setSeconds(now.getSeconds() + 15);

    const msg = {
      sales: {
        claim_item: {
          token_id: String(Math.floor(now.getTime() / 1000)),
          owner: account.bech32Address,
          token_uri: "",
          extension: {},
        },
      },
    };

    try {
      const claimRes = await client?.execute(
        account.bech32Address,
        seatContractAddress,
        msg,
        {
          amount: [{ amount: "0.001", denom: "uxion" }],
          gas: "500000",
        },
        "", // memo
        []
      );

      setExecuteResult(claimRes);
    } catch (error) {
      console.error("Transaction Error:", error);
    } finally {
      setLoading(false);
    }
  }
  const connectWallet = async () => {
    try {
      const wallet = await Abstraxion.connectWallet(); // Connect using Abstraxion SDK
      const address = wallet.address;
      setWalletAddress(address);
      const chainId = wallet.chainId;
      if (chainId !== parseInt(NETWORK_ID, 16)) {
        setNetworkError("Please switch to the CrossFi testnet.");
      } else {
        setNetworkError("");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error.message);
      toast.error("Failed to connect wallet");
    }
  };

  const switchNetwork = async () => {
    try {
      await Abstraxion.switchNetwork(NETWORK_ID); // Use Abstraxion SDK for network switch
      setNetworkError(""); // Clear the error once switched successfully
    } catch (error) {
      console.error("Error switching network:", error.message);
    }
  };

  const shortenAddress = (address) =>
    `${address.slice(0, 5)}...${address.slice(address.length - 4)}`;

  return (
    <>
      <Button fullWidth onClick={() => setShow(true)} structure="base">
        {account.bech32Address ? "VIEW ACCOUNT" : "CONNECT"}
      </Button>

      {/* {client && (
        <Button
          disabled={loading}
          fullWidth
          onClick={claimSeat}
          structure="base"
        >
          {loading ? "LOADING..." : "CLAIM SEAT"}
        </Button>
      )} */}

      <Abstraxion onClose={() => setShow(false)} />

      <Router>
        <Routes>
          <Route path="/" element={<Home address={walletAddress} />} />
          <Route
            path="/createInvoice"
            element={<CreateInvoice address={walletAddress} />}
          />
          <Route
            path="/viewInvoice"
            element={<ViewInvoice address={walletAddress} />}
          />
          <Route
            path="/payInvoice"
            element={<PayInvoice address={walletAddress} />}
          />
          <Route
            path="/payInvoiceQR/:invoiceId"
            element={<PayInvoiceQr address={walletAddress} />}
          />
          <Route
            path="/paymentConfirmation/:transactionHash"
            element={<PaymentConfirmation address={walletAddress} />}
          />
        </Routes>
      </Router>
      <ToastContainer />
    </>
  );
}

export default App;
