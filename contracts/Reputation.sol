// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal view into the Job contract's public `jobs` mapping getter.
///      Only the fields Reputation needs are declared; Solidity's ABI
///      decoding for external calls only reads as many return values as
///      the caller declares, so this stays valid even as Job.sol's struct
///      gains more fields.
interface IJob {
    function jobs(uint256 _jobId)
        external
        view
        returns (
            address client,
            string memory description,
            uint256 budget,
            bool isOpen,
            address freelancer,
            bool fundsReleased
        );
}

/// @title Reputation — freelancer ratings tied to real, paid-out jobs.
/// @notice Ratings can only be left by the client who actually hired and
///         paid a freelancer through the Job contract, exactly once per
///         job, and only after escrow has been released. This prevents the
///         previous design's flaw: anyone could call `rateFreelancer` for
///         any address, any number of times, with no link whatsoever to
///         real completed work — making ratings meaningless and gameable.
contract Reputation {
    IJob public immutable jobContract;

    struct Freelancer {
        uint256 completedJobs;
        uint256 totalRating;
        uint256 ratingCount;
        string projectLink;
    }

    mapping(address => Freelancer) public freelancers;
    /// @notice jobId => whether that job's one-time rating has been used.
    mapping(uint256 => bool) public jobRated;

    event FreelancerRated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint8 rating
    );

    constructor(address _jobContract) {
        require(_jobContract != address(0), "Job contract address required.");
        jobContract = IJob(_jobContract);
    }

    /// @notice Rate the freelancer of a job you hired and paid via the Job contract.
    /// @param _jobId The job to rate.
    /// @param _rating A score from 1 to 5.
    function rateFreelancer(uint256 _jobId, uint8 _rating) external {
        require(_rating > 0 && _rating <= 5, "Invalid rating (1-5)");
        require(!jobRated[_jobId], "Job already rated.");

        (address client, , , , address freelancerAddr, bool fundsReleased) = jobContract.jobs(_jobId);
        require(client != address(0), "Job does not exist.");
        require(msg.sender == client, "Only the hiring client can rate this job.");
        require(fundsReleased, "Job is not completed and paid yet.");

        jobRated[_jobId] = true;

        Freelancer storage freelancer = freelancers[freelancerAddr];
        freelancer.completedJobs++;
        freelancer.totalRating += _rating;
        freelancer.ratingCount++;

        emit FreelancerRated(_jobId, msg.sender, freelancerAddr, _rating);
    }

    function getReputation(address _freelancer) external view returns (uint256 averageRating, uint256 completedJobs) {
        Freelancer storage freelancer = freelancers[_freelancer];
        if (freelancer.ratingCount == 0) return (0, freelancer.completedJobs);
        return (freelancer.totalRating / freelancer.ratingCount, freelancer.completedJobs);
    }

    /// @notice Let a freelancer publish a link to their portfolio/work sample.
    function addProjectLink(string calldata _link) external {
        freelancers[msg.sender].projectLink = _link;
    }

    /// @notice Retrieve the project link for a freelancer.
    function getProjectLink(address _freelancer) external view returns (string memory) {
        return freelancers[_freelancer].projectLink;
    }
}
