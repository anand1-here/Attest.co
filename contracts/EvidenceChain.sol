// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceChain {
    struct Evidence {
        string caseId;
        string evidenceId;
        string hash;       // SHA-256 of the video
        string submitter;  // user ID of whoever added the evidence
        uint256 timestamp;
        bool exists;
    }

    mapping(string => Evidence) private records;

    // evidenceId is NOT indexed, so event readers get the real ID, not a hash.
    event EvidenceAdded(
        string evidenceId,
        string caseId,
        string hash,
        string submitter,
        uint256 timestamp
    );

    function addEvidence(
        string memory _caseId,
        string memory _evidenceId,
        string memory _hash,
        string memory _submitter
    ) public {
        require(!records[_evidenceId].exists, "Evidence already exists");
        records[_evidenceId] = Evidence(
            _caseId, _evidenceId, _hash, _submitter, block.timestamp, true
        );
        emit EvidenceAdded(_evidenceId, _caseId, _hash, _submitter, block.timestamp);
    }

    function getEvidenceHash(string memory _evidenceId) public view returns (string memory) {
        require(records[_evidenceId].exists, "Evidence not found");
        return records[_evidenceId].hash;
    }

    function getEvidence(string memory _evidenceId)
        public
        view
        returns (
            string memory caseId,
            string memory evidenceId,
            string memory hash,
            string memory submitter,
            uint256 timestamp
        )
    {
        require(records[_evidenceId].exists, "Evidence not found");
        Evidence memory e = records[_evidenceId];
        return (e.caseId, e.evidenceId, e.hash, e.submitter, e.timestamp);
    }
}
