
export const ActionButton = ({ text, onClick }: any) => {
    return (
            <button
                className="text-white bg-gradient-to-r from-gray-500 to-stone-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-gray-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                onClick={async () => await onClick()}
            >
                {text}
            </button>
    )
}
