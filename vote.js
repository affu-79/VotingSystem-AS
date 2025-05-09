console.log("vote.js loaded");

const contractAddress = "0x610faB97c7Dc46a26CDC221aEb4d65396A558A5C";
const contractABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "uint256", name: "candidateId", type: "uint256" }],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "voter", type: "address" },
      { indexed: true, internalType: "uint256", name: "candidateId", type: "uint256" },
    ],
    name: "Voted",
    type: "event",
  },
  {
    inputs: [],
    name: "candidateCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "candidates",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "uint256", name: "voteCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "candidateId", type: "uint256" }],
    name: "getVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasVoted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];


let web3;
let contract;
let userAccount = null;

window.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connectWalletBtn");
  console.log("Button found:", connectBtn);

  const statusDisplay = document.createElement("p");
  statusDisplay.className = "mt-2 text-light";
  connectBtn.insertAdjacentElement("afterend", statusDisplay);

  connectBtn.addEventListener("click", async () => {
    console.log("Connect button clicked");

    if (!window.ethereum) {
      statusDisplay.innerText = "MetaMask not detected. Please install it.";
      return;
    }

    if (!userAccount) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(contractABI, contractAddress);
        statusDisplay.innerText = `✅ Connected: ${userAccount}`;
        loadCandidates();
        loadWinner();
      } catch (err) {
        statusDisplay.innerText = `❌ Connection failed: ${err.message}`;
      }
    } else {
      userAccount = null;
      statusDisplay.innerText = "🔌 Disconnected";
      document.getElementById("candidates").innerHTML = "";
      document.getElementById("winner").innerText = "Disconnected";
    }
  });

  async function loadCandidates() {
    try {
      const count = await contract.methods.candidateCount().call();
      const container = document.getElementById("candidates");
      container.innerHTML = "";

      for (let i = 0; i < count; i++) {
        const cand = await contract.methods.candidates(i).call();
        const html = `
          <div class="col-md-4" data-aos="flip-left">
            <div class="candidate-card p-4 text-center h-100">
              <h4>${cand.name}</h4>
              <p>${cand.description}</p>
              <p><strong>Votes:</strong> ${cand.voteCount}</p>
              <button class="btn btn-primary" onclick="voteForCandidate(${i})">Vote</button>
            </div>
          </div>
        `;
        container.innerHTML += html;
      }
    } catch (err) {
      console.error("Error loading candidates:", err);
    }
  }

  async function voteForCandidate(index) {
    if (!userAccount) {
      statusDisplay.innerText = "⚠️ Connect MetaMask to vote.";
      return;
    }
    try {
      await contract.methods.vote(index).send({ from: userAccount });
      statusDisplay.innerText = "✅ Vote cast successfully!";
      loadCandidates();
      loadWinner();
    } catch (err) {
      statusDisplay.innerText = `❌ Voting failed: ${err.message}`;
    }
  }

  async function loadWinner() {
    try {
      const count = await contract.methods.candidateCount().call();
      let maxVotes = -1;
      let winnerName = "None";
      for (let i = 0; i < count; i++) {
        const cand = await contract.methods.candidates(i).call();
        if (parseInt(cand.voteCount) > maxVotes) {
          maxVotes = parseInt(cand.voteCount);
          winnerName = cand.name;
        }
      }
      document.getElementById("winner").innerText = winnerName;
    } catch (err) {
      console.warn("Could not fetch winner:", err);
    }
  }

  // Make the vote function accessible to inline onclick handler
  window.voteForCandidate = voteForCandidate;
});
