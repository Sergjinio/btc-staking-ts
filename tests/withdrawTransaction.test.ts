import {
  initBTCCurve,
  withdrawEarlyUnbondedTransaction,
  withdrawTimelockUnbondedTransaction,
} from "../src/index";
import { testingNetworks } from "./helper";
import { PsbtTransactionResult } from "../src/types/transaction";

describe("stakingTransaction", () => {
  beforeAll(() => {
    initBTCCurve();
  });

  testingNetworks.map(({ networkName, network, dataGenerator }) => {
    const feeRate = 1;
    const withdrawalAddress = dataGenerator.getNativeSegwitAddress(
      dataGenerator.generateRandomKeyPair().publicKey,
    );
    const {
      timelockScript,
      slashingScript,
      unbondingScript,
      unbondingTimelockScript,
    } = dataGenerator.generateMockStakingScripts();
    describe("Error path", () => {
      it(`${networkName} - should throw an error if the fee rate is less than or equal to 0`, () => {
        // Test case: fee rate is 0
        expect(() =>
          withdrawEarlyUnbondedTransaction(
            {
              unbondingTimelockScript,
              slashingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            0, // Invalid fee rate
          ),
        ).toThrow("Withdrawal feeRate must be bigger than 0");

        expect(() =>
          withdrawTimelockUnbondedTransaction(
            {
              timelockScript,
              slashingScript,
              unbondingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            0, // Invalid fee rate
          ),
        ).toThrow("Withdrawal feeRate must be bigger than 0");

        // Test case: fee rate is -1
        expect(() =>
          withdrawEarlyUnbondedTransaction(
            {
              unbondingTimelockScript,
              slashingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            0, // Invalid fee rate
          ),
        ).toThrow("Withdrawal feeRate must be bigger than 0");

        expect(() =>
          withdrawTimelockUnbondedTransaction(
            {
              timelockScript,
              slashingScript,
              unbondingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            0, // Invalid fee rate
          ),
        ).toThrow("Withdrawal feeRate must be bigger than 0");
      });

      it(`${networkName} - should throw an error if output index is invalid`, () => {
        expect(() =>
          withdrawEarlyUnbondedTransaction(
            {
              unbondingTimelockScript,
              slashingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            feeRate,
            -1, // invalid output index
          ),
        ).toThrow("Output index must be bigger or equal to 0");

        expect(() =>
          withdrawTimelockUnbondedTransaction(
            {
              timelockScript,
              slashingScript,
              unbondingScript,
            },
            dataGenerator.generateRandomTx().extractTransaction(),
            withdrawalAddress,
            network,
            feeRate,
            -1, // invalid output index
          ),
        ).toThrow("Output index must be bigger or equal to 0");
      });

      describe("Happy path", () => {
        {
          it(`${networkName} - should return a valid psbt result`, () => {
            const psbtResult = withdrawEarlyUnbondedTransaction(
              {
                unbondingTimelockScript,
                slashingScript,
              },
              dataGenerator.generateRandomTx().extractTransaction(),
              withdrawalAddress,
              network,
              feeRate,
            );
            validateCommonFields(psbtResult, withdrawalAddress);
          });

          it(`${networkName} - should return a valid psbt result`, () => {
            const psbtResult = withdrawTimelockUnbondedTransaction(
              {
                timelockScript,
                slashingScript,
                unbondingScript,
              },
              dataGenerator.generateRandomTx().extractTransaction(),
              withdrawalAddress,
              network,
              feeRate,
            );
            validateCommonFields(psbtResult, withdrawalAddress);
          });
        }
      });
    });
  });
});

const validateCommonFields = (
  psbtResult: PsbtTransactionResult,
  withdrawalAddress: string,
) => {
  expect(psbtResult).toBeDefined();
  // make sure the input amount is greater than the output amount
  const { psbt, fee } = psbtResult;
  const inputAmount = psbt.data.inputs.reduce(
    (sum, input) => sum + input.witnessUtxo!.value,
    0,
  );
  const outputAmount = psbt.txOutputs.reduce(
    (sum, output) => sum + output.value,
    0,
  );
  expect(inputAmount).toBeGreaterThan(outputAmount);
  expect(inputAmount - outputAmount).toEqual(fee);
  // check the withdrawal is sent to the withdrawal address
  expect(
    psbt.txOutputs.find((output) => output.address === withdrawalAddress),
  ).toBeDefined();
};
