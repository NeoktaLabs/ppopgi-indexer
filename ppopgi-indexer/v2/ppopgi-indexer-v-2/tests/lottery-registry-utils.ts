import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  LotteryRegistered,
  OwnershipTransferred,
  RegistrarSet
} from "../generated/LotteryRegistry/LotteryRegistry"

export function createLotteryRegisteredEvent(
  index: BigInt,
  typeId: BigInt,
  lottery: Address,
  creator: Address
): LotteryRegistered {
  let lotteryRegisteredEvent = changetype<LotteryRegistered>(newMockEvent())

  lotteryRegisteredEvent.parameters = new Array()

  lotteryRegisteredEvent.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  )
  lotteryRegisteredEvent.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromUnsignedBigInt(typeId))
  )
  lotteryRegisteredEvent.parameters.push(
    new ethereum.EventParam("lottery", ethereum.Value.fromAddress(lottery))
  )
  lotteryRegisteredEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )

  return lotteryRegisteredEvent
}

export function createOwnershipTransferredEvent(
  oldOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("oldOwner", ethereum.Value.fromAddress(oldOwner))
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRegistrarSetEvent(
  registrar: Address,
  authorized: boolean
): RegistrarSet {
  let registrarSetEvent = changetype<RegistrarSet>(newMockEvent())

  registrarSetEvent.parameters = new Array()

  registrarSetEvent.parameters.push(
    new ethereum.EventParam("registrar", ethereum.Value.fromAddress(registrar))
  )
  registrarSetEvent.parameters.push(
    new ethereum.EventParam(
      "authorized",
      ethereum.Value.fromBoolean(authorized)
    )
  )

  return registrarSetEvent
}
