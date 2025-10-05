import SpecLoader from "@/components/SpecLoader";
import OperationExplorer from "@/components/OperationExplorer";
import RequestBuilder from "@/components/RequestBuilder";

export default function App() {
  return (
    <div className="p-4 h-screen grid grid-rows-[auto_1fr] gap-4">
      <SpecLoader />
      <div className="grid grid-cols-[320px_1fr] gap-4 h-full overflow-hidden">
        <div className="border rounded p-2 overflow-auto">
          <OperationExplorer />
        </div>
        <div className="border rounded p-2 overflow-auto">
          <RequestBuilder />
        </div>
      </div>
    </div>
  );
}
