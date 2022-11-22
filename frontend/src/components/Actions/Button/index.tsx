const BUTTON_STYLES = "py-2 px-3 text-xs text-white bg-gradient-to-r from-gray-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 "


export const ActionButton = ({ text, clickCallback, enabled = true}: any) => {
    return (
        <button
            className={
                enabled ? BUTTON_STYLES + "to-red-500" : BUTTON_STYLES + "to-stone-500"
            }
            onClick={async () => await clickCallback()}
        >
            {text}
        </button>
    )
}
