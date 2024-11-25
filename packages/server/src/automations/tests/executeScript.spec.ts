import { createAutomationBuilder } from "./utilities/AutomationTestBuilder"
import * as automation from "../index"
import * as setup from "./utilities"
import { Table, AutomationStatus } from "@budibase/types"

describe("Execute Script Automations", () => {
  let config = setup.getConfig(),
    table: Table

  beforeEach(async () => {
    await automation.init()
    await config.init()
    table = await config.createTable()
    await config.createRow()
  })

  afterAll(setup.afterAll)

  it("should execute a basic script and return the result", async () => {
    const builder = createAutomationBuilder({
      name: "Basic Script Execution",
    })

    const results = await builder
      .appAction({ fields: {} })
      .executeScript({ code: "return 2 + 2" }, { stepId: "basic-script-step" })
      .run()

    expect(results.steps[0].outputs.result).toEqual(4)
  })

  it("should access bindings from previous steps", async () => {
    const builder = createAutomationBuilder({
      name: "Access Bindings",
    })

    const results = await builder
      .appAction({ fields: { data: [1, 2, 3] } })
      .executeScript(
        {
          code: "return steps['trigger'].fields.data.map(x => x * 2)",
        },
        { stepId: "binding-script-step" }
      )
      .run()

    expect(results.steps[0].outputs.result).toEqual([2, 4, 6])
  })

  it("should handle script execution errors gracefully", async () => {
    const builder = createAutomationBuilder({
      name: "Handle Script Errors",
    })

    const results = await builder
      .appAction({ fields: {} })
      .executeScript(
        { code: "return nonexistentVariable.map(x => x)" },
        { stepId: "error-script-step" }
      )
      .run()

    expect(results.steps[0].outputs.error).toContain(
      "ReferenceError: nonexistentVariable is not defined"
    )
    expect(results.steps[0].outputs.success).toEqual(false)
  })

  it("should handle conditional logic in scripts", async () => {
    const builder = createAutomationBuilder({
      name: "Conditional Script Logic",
    })

    const results = await builder
      .appAction({ fields: { value: 10 } })
      .executeScript(
        {
          code: `
            if (steps['trigger'].fields.value > 5) {
              return "Value is greater than 5";
            } else {
              return "Value is 5 or less";
            }
          `,
        },
        { stepId: "conditional-logic-step" }
      )
      .run()

    expect(results.steps[0].outputs.result).toEqual("Value is greater than 5")
  })

  it("should use multiple steps and validate script execution", async () => {
    const builder = createAutomationBuilder({
      name: "Multi-Step Script Execution",
    })

    const results = await builder
      .appAction({ fields: {} })
      .serverLog(
        { text: "Starting multi-step automation" },
        { stepId: "start-log-step" }
      )
      .createRow(
        { row: { name: "Test Row", value: 42, tableId: "12345" } },
        { stepId: "create-row-step" }
      )
      .executeScript(
        {
          code: `
            const createdRow = steps['create-row-step'].outputs;
            return createdRow.row.value * 2;
          `,
        },
        { stepId: "script-step" }
      )
      .serverLog(
        {
          text: `Final result is {{ steps['script-step'].outputs.result }}`,
        },
        { stepId: "final-log-step" }
      )
      .run()

    expect(results.steps[0].outputs.message).toContain(
      "Starting multi-step automation"
    )
    expect(results.steps[1].outputs.row.value).toEqual(42)
    expect(results.steps[2].outputs.result).toEqual(84)
    expect(results.steps[3].outputs.message).toContain("Final result is 84")
  })
})
