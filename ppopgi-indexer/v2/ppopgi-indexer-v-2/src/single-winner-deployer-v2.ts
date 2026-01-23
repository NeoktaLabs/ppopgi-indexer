import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployerV2"

import { LotterySingleWinner as LotterySingleWinnerTemplate } from "../generated/templates"

import { FactoryConfig, DeployerOwner, Raffle } from "../generated/schema"

import { createRaffleEvent, touchRaffle } from "./utils"

// Contract binding (template ABI) to fetch minPurchaseAmount (not in deployer event)
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

  // ✅ generated type is BigInt in your bindings
  cfg.callbackGasLimit = event.params.callbackGasLimit

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

    // ✅ V2: emitted; generated as BigInt in your bindings
    raffle.callbackGasLimit = event.params.callbackGasLimit

    // ✅ V2: not in deployer event; fetch from contract
    let lot = LotterySingleWinnerV2Contract.bind(raffleId)
    let minTry = lot.try_minPurchaseAmount()
    raffle.minPurchaseAmount = minTry.reverted ? BigInt.zero() : minTry.value

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
    // Update / backfill fields in case raffle was created via registry fallback first
    raffle.deployer = event.address
    raffle.creator = event.params.creator
    raffle.name = event.params.name
    raffle.usdc = event.params.usdc
    raffle.entropy = event.params.entropy
    raffle.entropyProvider = event.params.entropyProvider
    raffle.feeRecipient = event.params.feeRecipient
    raffle.protocolFeePercent = event.params.protocolFeePercent
    raffle.callbackGasLimit = event.params.callbackGasLimit

    // If registry fallback set minPurchaseAmount=0, try to fill it now
    if (raffle.minPurchaseAmount.equals(BigInt.zero())) {
      let lot = LotterySingleWinnerV2Contract.bind(raffleId)
      let minTry = lot.try_minPurchaseAmount()
      if (!minTry.reverted) {
        raffle.minPurchaseAmount = minTry.value
      }
    }

    touchRaffle(raffle, event)
    raffle.save()

    LotterySingleWinnerTemplate.create(raffleId)
  }

  // audit event
  let ev = createRaffleEvent(raffleId, "LOTTERY_DEPLOYED", event)
  ev.actor = event.params.creator
  ev.save()
}