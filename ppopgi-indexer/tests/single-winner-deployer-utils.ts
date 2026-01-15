import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ConfigUpdated,
  DeployerOwnershipTransferred,
  LotteryDeployed,
  RegistrationFailed
} from "../generated/SingleWinnerDeployer/SingleWinnerDeployer"

export function createConfigUpdatedEvent(
  usdc: Address,
  entropy: Address,
  provider: Address,
  feeRecipient: Address,
  protocolFeePercent: BigInt
): ConfigUpdated {
  let configUpdatedEvent = changetype<ConfigUpdated>(newMockEvent())

  configUpdatedEvent.parameters = new Array()

  configUpdatedEvent.parameters.push(
    new ethereum.EventParam("usdc", ethereum.Value.fromAddress(usdc))
  )
  configUpdatedEvent.parameters.push(
    new ethereum.EventParam("entropy", ethereum.Value.fromAddress(entropy))
  )
  configUpdatedEvent.parameters.push(
    new ethereum.EventParam("provider", ethereum.Value.fromAddress(provider))
  )
  configUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "feeRecipient",
      ethereum.Value.fromAddress(feeRecipient)
    )
  )
  configUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeePercent",
      ethereum.Value.fromUnsignedBigInt(protocolFeePercent)
    )
  )

  return configUpdatedEvent
}

export function createDeployerOwnershipTransferredEvent(
  oldOwner: Address,
  newOwner: Address
): DeployerOwnershipTransferred {
  let deployerOwnershipTransferredEvent =
    changetype<DeployerOwnershipTransferred>(newMockEvent())

  deployerOwnershipTransferredEvent.parameters = new Array()

  deployerOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam("oldOwner", ethereum.Value.fromAddress(oldOwner))
  )
  deployerOwnershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return deployerOwnershipTransferredEvent
}

export function createLotteryDeployedEvent(
  lottery: Address,
  creator: Address,
  winningPot: BigInt,
  ticketPrice: BigInt,
  name: string,
  usdc: Address,
  entropy: Address,
  entropyProvider: Address,
  feeRecipient: Address,
  protocolFeePercent: BigInt,
  deadline: BigInt,
  minTickets: BigInt,
  maxTickets: BigInt
): LotteryDeployed {
  let lotteryDeployedEvent = changetype<LotteryDeployed>(newMockEvent())

  lotteryDeployedEvent.parameters = new Array()

  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam("lottery", ethereum.Value.fromAddress(lottery))
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "winningPot",
      ethereum.Value.fromUnsignedBigInt(winningPot)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "ticketPrice",
      ethereum.Value.fromUnsignedBigInt(ticketPrice)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam("usdc", ethereum.Value.fromAddress(usdc))
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam("entropy", ethereum.Value.fromAddress(entropy))
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "entropyProvider",
      ethereum.Value.fromAddress(entropyProvider)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "feeRecipient",
      ethereum.Value.fromAddress(feeRecipient)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "protocolFeePercent",
      ethereum.Value.fromUnsignedBigInt(protocolFeePercent)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "deadline",
      ethereum.Value.fromUnsignedBigInt(deadline)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "minTickets",
      ethereum.Value.fromUnsignedBigInt(minTickets)
    )
  )
  lotteryDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "maxTickets",
      ethereum.Value.fromUnsignedBigInt(maxTickets)
    )
  )

  return lotteryDeployedEvent
}

export function createRegistrationFailedEvent(
  lottery: Address,
  creator: Address
): RegistrationFailed {
  let registrationFailedEvent = changetype<RegistrationFailed>(newMockEvent())

  registrationFailedEvent.parameters = new Array()

  registrationFailedEvent.parameters.push(
    new ethereum.EventParam("lottery", ethereum.Value.fromAddress(lottery))
  )
  registrationFailedEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )

  return registrationFailedEvent
}
