import { BigNumber } from "ethers"
import { arrayify, Interface } from "ethers/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { useContractRead, useContractWrite, usePrepareContractWrite, useSignMessage } from "wagmi"
import { CASTILLAN_CARDS } from "../../assets/castillan-cards"
import { AccountType, useAccountInformation } from "../../hooks/providers/Wagmi"
import { GAS_LIMIT_WRITE } from "../Dashboard"

export const Card = ({ match, onChangeAction, setProcessingAction }) => {

    const [cardName, setCardName ] = useState("")
    const [ cleanCardIndex, setCleanCardIndex ] = useState(-1)
    const [ signature, setSignature ] = useState("")
    const { address } : AccountType = useAccountInformation()
    const [ inProgress, setInProgress ] = useState(false)

    const changeAndCallback = (event: any) => {
        setCleanCardIndex(parseInt(event.target.value))
        setCardName(CASTILLAN_CARDS[parseInt(event.target.value)])
        onChangeAction(event)
    }

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)


    const validateCard = useCallback(() => {
        if (CASTILLAN_CARDS[cleanCardIndex] === undefined) {
            setEnableAction(false)
        } else {
            setEnableAction(true)
        }
    }, [cleanCardIndex])

    const { error: errorToSign, signMessage } = useSignMessage({
        onSuccess(signature: any, variables: any) {
            console.log("firm",signature)
            console.log("arrary before", signature)
            setSignature(signature)
            setGoToSpell(true)
            console.log('go to write')
        }
    })
    const onWrite = () => {
        console.log('go')
        getHashToSign().then((result) => {
            console.log('sucess get hash for play card', result, result.data?.toString())
            signMessage({
                message: arrayify(result.data)
            })
            //write?.({
            //    args: [cleanCardIndex, result.data]})
        }).catch((err: Error) => {
            setProcessingAction(false)
            console.log('error after get hash to sign from contract', err)
        })
    }

    const { refetch: getHashToSign } = useContractRead({
        addressOrName: match,
        contractInterface: new Interface(["function getCardProofToForSigning(address, uint8[]) public view returns (bytes32)"]),
        functionName: "getCardProofToForSigning",
        enabled: inProgress,
        args: [address, [ BigNumber.from(cleanCardIndex.toString() ??  "0")]],
        overrides: {
            from: address as string
        },
        onSuccess: (data) => {
            console.log('we', data)
        },
        onError: (err: Error) => {
            console.log('dos', err)
        }
    })

    const { config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: new Interface(["function playCard(uint8, bytes) public"]),
        functionName: "playCard",
        enabled: goToSpell,
        staleTime: 2000,
        args: [ BigNumber.from(cleanCardIndex.toString()), signature],
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            console.log(`can't playCard (TRUE)`, data)
            //validateCard()
            write?.()
        },
        onError: (err: Error) => {
            console.log(`can't playCard (FALSE)`, err)
            setEnableAction(false)
        }
    })

    const { write, error, isLoading, data }= useContractWrite(config)

    useEffect(() => {
        console.log('validate card')
        validateCard()
    }, [validateCard])

    useEffect(() => {
        console.log('spell', error)
        console.log('spell', errorToSign)
        if ((error || errorToSign)) {
            setGoToSpell(false)
            setInProgress(false)
            setProcessingAction(false)
        }
    }, [ error, errorToSign ])

    return (
        <div className="relative">
            <label className="block mb-2 text-sm font-medium text-gray-300">Card<span className="text-xs mx-2">{cardName}</span>
            <input onChange={changeAndCallback} type="text" className="block p-2 pl-5 w-full text-sm rounded-lg border bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500" />
            {
                enableAction ?
                    <button onClick={() => {
                    console.log('na bolo')
                        setProcessingAction(true)
                        setInProgress(true)
                        onWrite()
                    }} className="text-white absolute right-2.5 bottom-1.5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-800 font-medium rounded-lg text-sm px-2 py-1">
                        PlayCard
                    </button>
                : ""
            }
            </label>
        </div>
    )
}
