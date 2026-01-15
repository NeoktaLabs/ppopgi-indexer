import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent,
  RegistrationFailed as RegistrationFailedEvent
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer"

import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates"

import {
  FactoryConfig,
  DeployerOwner,
  Raffle,
  RaffleStatus,
  RaffleEventType
} from "../generated/schema"

import { createRaffleEvent, touchRaffle } from "./utils"

export function handleConfigUpdated(event: ConfigUpdatedEvent): void {
  let id = event.address as Address

  let cfg = FactoryConfig.load(id)
  if (cfg == null) {
    cfg = new FactoryConfig(id)
  }

  cfg.usdc = event.params.usdc
  cfg.entropy = event.params.entropy
  cfg.provider = event.params.provider
  cfg.feeRecipient = event.params.feeRecipient
  cfg.protocolFeePercent = event.params.protocolFeePercent
  cfg.updatedAtBlock = event.block.number
  cfg.updatedAtTimestamp = event.block.timestamp
  cfg.updatedTx = event.transaction.hash
  cfg.save()

  // Optional: write a global audit event? (not tied to a raffle)
  // We keep audit events tied to raffles only.
}

export function handleDeployerOwnershipTransferred(
  event: DeployerOwnershipTransferredEvent
): void {
  let id = event.address as Address

  let d = DeployerOwner.load(id)
  if (d == null) {
    d = new DeployerOwner(id)
  }

  d.owner = event.params.newOwner
  d.updatedAtBlock = event.block.number
  d.updatedAtTimestamp = event.block.timestamp
  d.updatedTx = event.transaction.hash
  d.save()
}

export function handleLotteryDeployed(event: LotteryDeployedEvent): void {
  let raffleId = event.params.lottery

  let raffle = Raffle.load(raffleId)
  if (raffle == null) {
    raffle = new Raffle(raffleId)

    // canonical discovery
    raffle.deployer = event.address
    raffle.isRegistered = false
    raffle.paused = false

    // immutable creation metadata
    raffle.creator = event.params.creator
    raffle.name = event.params.name
    raffle.createdAtBlock = event.block.number
    raffle.createdAtTimestamp = event.block.timestamp
    raffle.creationTx = event.transaction.hash

    raffle.usdc = event.params.usdc
    raffle.entropy = event.params.entropy
    raffle.entropyProvider = event.params.entropyProvider
    raffle.feeRecipient = event.params.feeRecipient
    raffle.protocolFeePercent = event.params.protocolFeePercent

    raffle.winningPot = event.params.winningPot
    raffle.ticketPrice = event.params.ticketPrice
    raffle.deadline = BigInt.fromU64(event.params.deadline)
    raffle.minTickets = BigInt.fromU64(event.params.minTickets)
    raffle.maxTickets = BigInt.fromU64(event.params.maxTickets)

    // lifecycle defaults
    raffle.status = RaffleStatus.OPEN
    raffle.sold = BigInt.zero()
    raffle.ticketRevenue = BigInt.zero()
    raffle.winner = null
    raffle.winningTicketIndex = null
    raffle.finalizeRequestId = null
    raffle.finalizedAt = null
    raffle.selectedProvider = null
    raffle.completedAt = null
    raffle.canceledReason = null
    raffle.canceledAt = null
    raffle.soldAtCancel = null

    touchRaffle(raffle, event)
    raffle.save()

    // Create template to index this lottery instance
    LotterySingleWinnerTemplate.create(raffleId)
  } else {
    // If already exists, still touch
    touchRaffle(raffle, event)
    raffle.save()
  }

  // audit event
  let ev = createRaffleEvent(raffleId, RaffleEventType.LOTTERY_DEPLOYED, event)
  ev.actor = event.params.creator
  ev.save()
}

export function handleRegistrationFailed(event: RegistrationFailedEvent): void {
  let raffleId = event.params.lottery

  // audit event (even if raffle doesn't exist yet, but it should)
  let ev = createRaffleEvent(raffleId, RaffleEventType.REGISTRATION_FAILED, event)
  ev.actor = event.params.creator
  ev.save()
}