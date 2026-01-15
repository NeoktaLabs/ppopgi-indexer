# Lottery Indexer - Frontend Documentation

This document describes the Lottery Indexer (Subgraph) used by the frontend to display and interact with the Single-Winner Lottery protocol deployed on Etherlink (Tezos L2).

The indexer is built with The Graph and provides a read-optimized, queryable view of lotteries, their lifecycle, and related on-chain events.

## Overview

What the indexer provides

- Discovery of deployed lotteries
- Lottery lifecycle tracking
- Ticket sales and revenue aggregation
- Winner selection, refunds, payouts
- Admin and protocol actions
- Event timeline and audit trail

What the indexer does not provide

- User balances
- Token allowances
- Exact claimable amounts

These must still be fetched directly from the blockchain via RPC calls.

## Entities

### Raffle

Represents one deployed lottery contract.

- Entity name: Raffle
- ID: lottery contract address (Bytes)
- Primary entity for list and detail screens

Key fields

- id: Lottery contract address
- name: Lottery name
- creator: Creator address
- status: OPEN, DRAWING, COMPLETED, CANCELED
- paused: Whether the lottery is paused
- ticketPrice: Price per ticket
- winningPot: Total prize
- sold: Tickets sold
- ticketRevenue: Total ticket revenue
- deadline: Timestamp cutoff
- winner: Winner address (if completed)
- winningTicketIndex: Winning ticket index
- completedAt: Completion timestamp
- canceledReason: Reason for cancellation
- isRegistered: Registry status
- registry: Registry contract address
- typeId: Registry type id
- registryIndex: Registry index
- createdAtTimestamp: Creation time
- lastUpdatedTimestamp: Last update time

Typical frontend usage

- Lottery list page
- Lottery detail page
- Status badges and action gating
- Countdown timers

### RaffleEvent

Represents a single on-chain event, normalized for UI use.

- Entity name: RaffleEvent
- ID: txHash + logIndex
- Used for activity feeds and audit UI

Key fields

- id: txHash plus logIndex
- raffle: Parent raffle id
- type: Event type string
- blockTimestamp: Timestamp
- txHash: Transaction hash
- actor: Primary actor address
- target: Secondary address
- amount: Primary amount
- amount2: Secondary amount
- uintValue: Generic numeric value
- text: Human-readable message
- reasonCode: Error or rejection code
- requestId: RNG or entropy request id

Common event types

- TICKETS_PURCHASED
- LOTTERY_FINALIZED
- CALLBACK_REJECTED
- WINNER_PICKED
- GOVERNANCE_LOCK_UPDATED
- LOTTERY_CANCELED
- EMERGENCY_RECOVERY
- PRIZE_ALLOCATED
- REFUND_ALLOCATED
- FUNDS_CLAIMED
- NATIVE_REFUND_ALLOCATED
- NATIVE_CLAIMED
- PROTOCOL_FEES_COLLECTED
- ENTROPY_PROVIDER_UPDATED
- ENTROPY_CONTRACT_UPDATED
- LOTTERY_OWNER_CHANGED
- PAUSED
- UNPAUSED
- SURPLUS_SWEPT
- NATIVE_SURPLUS_SWEPT
- LOTTERY_DEPLOYED
- LOTTERY_REGISTERED
- REGISTRATION_FAILED

### Admin and protocol entities (optional)

These are useful for admin dashboards or transparency pages.

- FactoryConfig: Global protocol configuration (per deployer)
- DeployerOwner: Deployer owner tracking
- RegistryOwner: Registry owner tracking
- Registrar: Authorized registrars list

## Recommended GraphQL queries

Note: This section uses indented code blocks (no triple backticks) for maximum renderer compatibility.

Lottery list

    query Raffles {
      raffles(
        first: 20
        orderBy: createdAtTimestamp
        orderDirection: desc
      ) {
        id
        name
        status
        paused
        ticketPrice
        deadline
        sold
        winningPot
        isRegistered
      }
    }

Lottery detail

    query RaffleDetail($id: Bytes!) {
      raffle(id: $id) {
        id
        name
        creator
        status
        paused

        ticketPrice
        winningPot
        deadline
        minTickets
        maxTickets

        sold
        ticketRevenue

        finalizeRequestId
        finalizedAt
        selectedProvider

        winner
        winningTicketIndex
        completedAt

        canceledReason
        canceledAt

        createdAtTimestamp
        lastUpdatedTimestamp
      }
    }

Lottery event timeline

    query RaffleEvents($raffle: Bytes!) {
      raffleEvents(
        where: { raffle: $raffle }
        orderBy: blockTimestamp
        orderDirection: desc
        first: 50
      ) {
        type
        blockTimestamp
        actor
        target
        amount
        amount2
        text
        txHash
      }
    }

User activity (my history)

    query MyActivity($user: Bytes!) {
      raffleEvents(
        where: { actor: $user }
        orderBy: blockTimestamp
        orderDirection: desc
        first: 50
      ) {
        type
        raffle { id }
        amount
        blockTimestamp
        txHash
      }
    }

## Status and UI logic

Raffle status meaning

- OPEN: Tickets can be purchased
- DRAWING: RNG requested
- COMPLETED: Winner selected
- CANCELED: Lottery canceled

Disable UI actions when

- paused is true
- status is not OPEN

## On-chain reads still required

The subgraph does not track per-user balances.

Frontend should still read from contracts for:

- User token balance
- Token allowance
- Claimable rewards or refunds
- Claim status

Recommended architecture

- Subgraph for structure, history, discovery
- RPC for live user-specific state and transactions

## Indexer guarantees

- Lotteries are indexed via deployer and registry discovery
- Events are append-only and ordered
- Dynamic templates ensure new lotteries appear automatically

## Common frontend patterns

- Cache the raffles list
- Poll raffle(id) periodically for status changes
- Paginate raffleEvents for activity feeds
- Map event type strings to icons and labels
- Link txHash to a block explorer

## Future improvements (optional)

- Add a TicketPosition entity for user ticket ownership
- Add aggregate stats and snapshots

## Summary

For frontend developers:

- Main entity: Raffle
- History and activity: RaffleEvent
- Discovery: automatic
- Suitable for production UI