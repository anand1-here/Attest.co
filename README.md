::: {align="center"}
# 🛡️ Attest

### Blockchain-Based Secure Digital Evidence Platform

**Making Digital Evidence Tamper-Evident, Verifiable & Trustworthy**

![AI](https://img.shields.io/badge/AI-MesoNet-0A84FF)
![Blockchain](https://img.shields.io/badge/Blockchain-Solidity-7B2CBF)
![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Node.js-5FA04E)
![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1)

`<img src="assets/attest-hash-animation.gif" alt="Attest SHA-256 hashing and blockchain verification animation" width="850" />`{=html}

**🔐 Secure Evidence  \|  🤖 AI Deepfake Detection  \|  ⛓️ Blockchain
Integrity**
:::

------------------------------------------------------------------------

## 📌 Overview

**Attest** is a digital evidence management and verification platform
that combines AI-powered deepfake analysis, cryptographic hashing, and
blockchain technology to help protect the integrity and traceability of
digital evidence.

It brings together two major capabilities:

-   **Evidence protection:** Generate a SHA-256 hash for uploaded
    evidence and register its record on a blockchain, making later
    integrity checks possible.
-   **Deepfake detection:** Analyze images and videos using an AI model
    to estimate whether the submitted media may be manipulated.

## ✨ Key Features

-   **Evidence upload and tracking** --- Submit digital evidence and
    associate it with a case and evidence record.
-   **SHA-256 hashing** --- Generate a cryptographic fingerprint for
    evidence files.
-   **Blockchain registration** --- Store evidence hash records through
    a Solidity smart contract.
-   **Integrity verification** --- Recalculate and compare hashes to
    detect changes to a file.
-   **AI deepfake analysis** --- Analyze media using the MesoNet-based
    detection component.
-   **Analysis results** --- Present a REAL/FAKE prediction with a
    confidence or probability score.
-   **User authentication and roles** --- Support authenticated access
    and role-based workflows.
-   **Dashboard and audit information** --- Help users review evidence
    records and related activity.

## ⚙️ Technology Stack

  Area                     Technologies
  ------------------------ --------------------------------------------
  Frontend                 React
  Backend                  Node.js, Express.js
  Database                 PostgreSQL
  Blockchain               Solidity, Ganache, Ethers.js
  AI / Deepfake Analysis   Python, TensorFlow, MesoNet, OpenCV, NumPy
  Security                 SHA-256, JWT, bcrypt

## 🔄 How It Works

1.  **Submit evidence:** A user uploads a digital evidence file and
    provides the relevant case details.
2.  **Generate fingerprint:** Attest calculates the file's SHA-256 hash.
3.  **Register record:** The hash and associated evidence record are
    registered through the blockchain smart contract.
4.  **Verify integrity:** When verification is requested, Attest hashes
    the file again and compares it with the registered hash.
5.  **Analyze media:** When deepfake analysis is needed, the media is
    processed by the AI detection component and a prediction is
    returned.

## 🧱 Project Components

-   **Web application:** User-facing interface for evidence workflows
    and results.
-   **Backend services:** Authentication, evidence handling, database
    operations, and application logic.
-   **Smart contract:** Blockchain-based registration of evidence hash
    records.
-   **Deepfake analysis module:** AI-based media analysis using MesoNet
    and supporting computer-vision libraries.

## 🚀 Getting Started

1.  Clone the repository:

    ``` bash
    git clone https://github.com/anand1-here/Attest.co.git
    cd Attest.co
    ```

2.  Follow the installation, environment-variable, database, and run
    instructions in **[SETUP.md](SETUP.md)**.

> Keep credentials and private environment variables out of source
> control. Use the example environment file as a reference where
> provided.

## 👥 Team AlgoFoge

  Name                 Role
  -------------------- -------------
  **Krishna Kumar**    Team Lead
  Muskan               Team Member
  Anand Kumar Dhakad   Team Member
  Divyansh Kumar       Team Member

## ⚠️ Disclaimer

-   A blockchain record can help demonstrate that a file matches a
    previously registered hash; it does **not** prove that the original
    evidence was genuine or accurate.
-   AI deepfake predictions are probabilistic and should not be treated
    as definitive proof.
-   Legal admissibility and evidentiary weight are determined by
    applicable laws and the relevant judicial authorities.

------------------------------------------------------------------------

::: {align="center"}
**Attest --- Protecting Digital Evidence Through AI, Cryptography &
Blockchain.**
:::
