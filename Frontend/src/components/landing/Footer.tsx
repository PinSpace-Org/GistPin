export default function Footer() {
  return (
    <footer className="py-8 bg-[#111827]">
      <div className="max-w-5xl px-4 mx-auto text-center text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} GistPin. Powered by the Flare
          Network.
        </p>
        {/* Add social links here in the future */}
      </div>
    </footer>
  );
}
