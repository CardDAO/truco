import { Button } from "./Button"
import { EthersJSContext } from "../../"
import { useCallback, useContext, useState, useEffect } from 'react'
import { walletParser } from "../../hooks/helpers/walletParser"

export const Wallet = () => {
    const selectedLibrary =  useContext(EthersJSContext)
    const [account, setAccount]  = useState(undefined)
    const [message, setMessage]  = useState("")
    const [balance, setBalance]  = useState(0)


    const getBalance = useCallback(async () => {
        let balanceToNumber : number;
        balanceToNumber = (await selectedLibrary.getBalance()) as number ?? 0 
        balanceToNumber = Number(( balanceToNumber / 1e18).toFixed(2));
        setBalance(balanceToNumber)
    }, [ setBalance, selectedLibrary ])

    useEffect(() => {
        if (account) {
            getBalance()
        }
    }, [account, getBalance])

    const connect = useCallback(() => {
        selectedLibrary.connect().then(() => {
            setAccount(selectedLibrary.account)
        }).catch((error: any) => {
            if (error.code > 0) {
               setMessage("Error - reconnect")
           }
           setMessage("Loading...")
           setAccount(undefined)
        })
    }, [setAccount, setMessage, selectedLibrary])

    const checkConnection = useCallback(async() => {
        selectedLibrary.verify((accounts: any) => {
            if(accounts.length === 0) {
                setAccount(undefined)
            } else {
                connect()
            }
        }, async () => {
            setAccount(undefined)
        })
    }, [connect, selectedLibrary, setAccount])

    useEffect(() => {
        checkConnection()
    }, [checkConnection, account])


    return (
        <>
        {
            !account ?
                message.length > 0 
                    ? 
                        <p className="text-white">{message}</p>
                        :
                        <Button
                            onClick={connect}
                            useStyle="connect"
                            text="Connect wallet"
                        />
            :
            <div className="text-center">
              <p className="">
                <span className="bg-slate-300 p-2 rounded-md">{walletParser(account)}</span>
                <span className="bg-amber-300 p-2 ml-1 rounded-md">{balance} ETH</span>
              </p>
            </div>
        }
        </>
    )
}

