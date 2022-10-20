import './index.css'

export const Button = ({ useStyle, onClick, text }: any) => {

    return <button
        onClick={() => { onClick() }}
        type="button"
        className={useStyle}
    >
        {text}
    </button>
}
