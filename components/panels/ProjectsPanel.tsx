export function ProjectsPanel() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="text-accent">Projects</h3>
      <hr className="border-ring/40" />
      <h4>Algo Trading System</h4>
      <ul>
        <li>
          Built and deployed a semi-automated trading system on CoinDCX with
          consistent monthly profits.
        </li>
        <li>
          High-concurrency bot in Go using goroutines to analyze 400+ tokens in
          parallel.
        </li>
        <li>
          Integrated Telegram for remote control and Pushover for instant
          alerts.
        </li>
        <li>Deployed on AWS EC2 using tmux for 24/7 reliability.</li>
      </ul>
      <hr className="border-ring/40" />
      <h4>VeriCred: Blockchain Credentialing</h4>
      <ul>
        <li>
          Credentials as NFTs; web portal for issuers; wallet-based verification
          for users.
        </li>
        <li>Employer-friendly verification flow to reduce forgeries.</li>
        <li>Backend services for issuers and credential minting pipeline.</li>
      </ul>
      <hr className="border-ring/40" />
      <h4>IPFS Health Storage</h4>
      <p>Python, Django, REST API, IPFS, Solidity</p>
      <ul>
        <li>
          Django REST backend for multi-format medical data (text, image, video,
          PDF).
        </li>
        <li>
          Decentralized storage via IPFS and integrity via Ethereum smart
          contracts.
        </li>
        <li>
          Robust media processing, blockchain TX verification, and secure error
          handling.
        </li>
        <li>
          Encrypted storage, immutable on-chain records, and unique patient
          verification IDs.
        </li>
      </ul>
    </div>
  );
}
