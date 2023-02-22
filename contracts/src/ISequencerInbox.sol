// SPDX-License-Identifier: Apache-2.0

/*
 * Modifications Copyright 2022, Specular contributors
 *
 * This file was changed in accordance to Apache License, Version 2.0.
 *
 * Copyright 2021, Offchain Labs, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pragma solidity ^0.8.0;

interface ISequencerInbox {
    event TxBatchAppended(uint256 batchNumber, uint256 startTxNumber, uint256 endTxNumber);

    /// @dev Thrown when the given tx inlcusion proof has incorrect accumulator or batch no.
    error IncorrectAccOrBatch();

    /// @dev Thrown when sequencer tries to append an empty batch
    error EmptyBatch();

    /// @dev Thrown when overflow occurs reading txBatch (likely due to malformed txLengths)
    error TxBatchDataOverflow();

    /**
     * @notice Gets inbox size (number of messages).
     */
    function getInboxSize() external view returns (uint256);

    /**
     * @notice Appends a batch of transactions (stored in calldata) and emits a TxBatchAppended event.
     * @param contexts Array of contexts, where each context is represented by a uint256 3-tuple:
     * (numTxs, l2BlockNumber, l2Timestamp). Each context corresponds to a single "L2 block".
     * @param txLengths Array of lengths of each encoded tx in txBatch.
     * @param txBatch Batch of RLP-encoded transactions.
     */
    function appendTxBatch(uint256[] calldata contexts, uint256[] calldata txLengths, bytes calldata txBatch)
        external;

    /**
     * @notice Verifies that a transaction exists in a batch, at the expected offset.
     * @param proof Proof of inclusion of transaction, in the form:
     * proof := txInfo || batchInfo || {foreach tx in batch: (prefixHash || txDataHash), ...} where,
     * txInfo := (sender || l2BlockNumber || l2Timestamp || txDataLength || txData)
     * batchInfo := (batchNum || numTxsBefore || numTxsAfterInBatch || accBefore)
     * TODO: modify based on OSP format.
     */
    function verifyTxInclusion(bytes memory proof) external view;
}
