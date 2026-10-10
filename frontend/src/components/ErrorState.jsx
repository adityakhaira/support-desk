export default function ErrorState({ message }) {
  return <div className="state-box error-box">{message || 'Something went wrong.'}</div>;
}
