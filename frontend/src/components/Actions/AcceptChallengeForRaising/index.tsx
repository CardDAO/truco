import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const AcceptChallengeForRaising = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function acceptChallengeForRaising() public"])}
            writeFunctionName={"acceptChallengeForRaising"}
            writeArgs={[]}
            checkExecute={true}
            canSelectorInterface={new Interface(["function canResponse(address) external view returns(bool)"])}
            canFunctionName="canResponse"
            canFunctionArgs={[match]}
            canContractAddress={process.env.FRONT_MATCH_FACADE_ADDRESS}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="AcceptChallengeForRaising!"
        />
    )
}
