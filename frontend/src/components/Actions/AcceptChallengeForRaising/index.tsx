import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const AcceptChallengeForRaising = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function acceptChallengeForRaising() public"])}
            writeFunctionName={"acceptChallengeForRaising"}
            writeArgs={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="AcceptChallengeForRaising!"
        />
    )
}
