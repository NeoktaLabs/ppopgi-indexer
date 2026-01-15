import {
  ConfigUpdated as ConfigUpdatedEvent,
  DeployerOwnershipTransferred as DeployerOwnershipTransferredEvent,
  LotteryDeployed as LotteryDeployedEvent,
  RegistrationFailed as RegistrationFailedEvent
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer"
import {
  ConfigUpdated,
  DeployerOwnershipTransferred,
  LotteryDeployed,
  RegistrationFailed
} from "../generated/schema"

export function handleConfigUpdated(event: ConfigUpdatedEvent): void {
  let entity = new ConfigUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.usdc = event.params.usdc
  entity.entropy = event.params.entropy
  entity.provider = event.params.provider
  entity.feeRecipient = event.params.feeRecipient
  entity.protocolFeePercent = event.params.protocolFeePercent

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeployerOwnershipTransferred(
  event: DeployerOwnershipTransferredEvent
): void {
  let entity = new DeployerOwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldOwner = event.params.oldOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleLotteryDeployed(event: LotteryDeployedEvent): void {
  let entity = new LotteryDeployed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lottery = event.params.lottery
  entity.creator = event.params.creator
  entity.winningPot = event.params.winningPot
  entity.ticketPrice = event.params.ticketPrice
  entity.name = event.params.name
  entity.usdc = event.params.usdc
  entity.entropy = event.params.entropy
  entity.entropyProvider = event.params.entropyProvider
  entity.feeRecipient = event.params.feeRecipient
  entity.protocolFeePercent = event.params.protocolFeePercent
  entity.deadline = event.params.deadline
  entity.minTickets = event.params.minTickets
  entity.maxTickets = event.params.maxTickets

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRegistrationFailed(event: RegistrationFailedEvent): void {
  let entity = new RegistrationFailed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lottery = event.params.lottery
  entity.creator = event.params.creator

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
