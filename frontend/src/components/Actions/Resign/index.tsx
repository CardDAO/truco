import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"
//function resign() publicfunction resign() publicfunction resign() public
export const Resign = ({ match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function resign() public"])}
            writeFunctionName={"resign"}
            writeArgs={[]}
            checkExecute={false}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Resign!"
        />
    )
}
