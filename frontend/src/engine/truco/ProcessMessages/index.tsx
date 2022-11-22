import { useCallback, useState, useEffect } from 'react'

export const useProcessMessage = ({ messages, onNewMessage}: any) => {
    const [lastIndexProcessed, setLastIndexProcessed] = useState(-1)

    const callbackMessage = useCallback((messageToProcess: MessageType) => {
        console.log('processing, message form callback', messageToProcess)
            onNewMessage(messageToProcess)
    }, [onNewMessage, messages])

    useEffect(() => {
        if(messages.length > 0 && messages.length > (lastIndexProcessed+1)) {
            console.log('to process mesasge', lastIndexProcessed)
            const indexToProcess = lastIndexProcessed + 1
            const messageToProcess = messages[indexToProcess]
            setLastIndexProcessed(lasted => lasted + 1)
            callbackMessage(messageToProcess)
        }
    }, [messages, onNewMessage, callbackMessage, lastIndexProcessed])
}
