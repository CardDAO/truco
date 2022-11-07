import { expect } from 'chai'

import { IERC3333 } from '../../typechain-types/contracts/trucoV1/interfaces/IERC3333'
import { ChallengeEnum } from './struct-enums'
import { deployEngineContract } from '../deploy-engine-contract'

import MoveStruct = IERC3333.MoveStruct
import TransactionStruct = IERC3333.TransactionStruct

import { BigNumber } from 'ethers'

describe('Engine Main Logic', function () {
    describe('Turn handling', function () {
        it('Incorrect turn', async function () {
            const { engine } = await deployEngineContract()

            let state = await engine.initialGameState()

            let move: MoveStruct = {
                action: BigNumber.from(ChallengeEnum.None),
                parameters: [],
            }

            let transaction: TransactionStruct = {
                playerIdx: state.playerTurn + 1,
                moves: [move],
                state: state,
            }

            await expect(
                engine.executeTransaction(transaction)
            ).to.be.revertedWith('Incorrect player turn')
        })
    })
})
