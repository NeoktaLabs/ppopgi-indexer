import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { LotteryRegistered } from "../generated/schema"
import { LotteryRegistered as LotteryRegisteredEvent } from "../generated/LotteryRegistry/LotteryRegistry"
import { handleLotteryRegistered } from "../src/lottery-registry"
import { createLotteryRegisteredEvent } from "./lottery-registry-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let index = BigInt.fromI32(234)
    let typeId = BigInt.fromI32(234)
    let lottery = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let creator = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newLotteryRegisteredEvent = createLotteryRegisteredEvent(
      index,
      typeId,
      lottery,
      creator
    )
    handleLotteryRegistered(newLotteryRegisteredEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("LotteryRegistered created and stored", () => {
    assert.entityCount("LotteryRegistered", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "LotteryRegistered",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "index",
      "234"
    )
    assert.fieldEquals(
      "LotteryRegistered",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "typeId",
      "234"
    )
    assert.fieldEquals(
      "LotteryRegistered",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "lottery",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "LotteryRegistered",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "creator",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
