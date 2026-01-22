import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployerV2"

import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates"
import { FactoryConfig, DeployerOwner, Raffle } from "../generated/schema"
import { createRaffleEvent, touchRaffle } from "./utils"

// To read minPurchaseAmount (not emitted by deployer event)
import { LotterySingleWinnerV2 as LotterySingleWinnerV2Contract } from "../generated/templates/LotterySingleWinner/LotterySingleWinnerV2"

export function handleConfigUpdated(event: ConfigUpdatedEvent): void {
  let id = event.address as Address

  let cfg = FactoryConfig.load(id)
  if (cfg == null) {
    cfg = new FactoryConfig(id)
  }

  cfg.usdc = event.params.usdc
  cfg.entropy = event.params.entropy
  cfg.provider = event.params.provider
  cfg.callbackGasLimit = BigInt.fromU32(event.params.callbackGasLimit)
  cfg.feeRecipient = event.params.feeRecipient
  cfg.protocolFeePercent = event.params.protocolFeePercent

  cfg.updatedAtBlock = event.block.number
  cfg.updatedAtTimestamp = event.block.timestamp
  cfg.updatedTx = event.transaction.hash
  cfg.save()
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

    // ✅ V2: callbackGasLimit is emitted
    raffle.callbackGasLimit = BigInt.fromU32(event.params.callbackGasLimit)

    // ✅ V2: minPurchaseAmount is NOT emitted — fetch from contract
    let lot = LotterySingleWinnerV2Contract.bind(raffleId)
    let minTry = lot.try_minPurchaseAmount()
    raffle.minPurchaseAmount = minTry.reverted
      ? BigInt.zero()
      : BigInt.fromU32(minTry.value)

    raffle.winningPot = event.params.winningPot
    raffle.ticketPrice = event.params.ticketPrice
    raffle.deadline = event.params.deadline
    raffle.minTickets = event.params.minTickets
    raffle.maxTickets = event.params.maxTickets

    // lifecycle defaults
    raffle.status = "FUNDING_PENDING"
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
    // Ensure new required fields exist (in case entity was created via registry fallback)
    if (raffle.callbackGasLimit == null) {
      raffle.callbackGasLimit = BigInt.fromU32(event.params.callbackGasLimit)
    }
    if (raffle.minPurchaseAmount == null) {
      let lot = LotterySingleWinnerV2Contract.bind(raffleId)
      let minTry = lot.try_minPurchaseAmount()
      raffle.minPurchaseAmount = minTry.reverted
        ? BigInt.zero()
        : BigInt.fromU32(minTry.value)
    }

    // Update a few fields that might be missing
    raffle.deployer = event.address
    raffle.creator = event.params.creator
    raffle.name = event.params.name
    raffle.usdc = event.params.usdc
    raffle.entropy = event.params.entropy
    raffle.entropyProvider = event.params.entropyProvider
    raffle.feeRecipient = event.params.feeRecipient
    raffle.protocolFeePercent = event.params.protocolFeePercent
    raffle.callbackGasLimit = BigInt.fromU32(event.params.callbackGasLimit)

    touchRaffle(raffle, event)
    raffle.save()

    LotterySingleWinnerTemplate.create(raffleId)
  }

  // audit event
  let ev = createRaffleEvent(raffleId, "LOTTERY_DEPLOYED", event)
  ev.actor = event.params.creator
  ev.save()
}