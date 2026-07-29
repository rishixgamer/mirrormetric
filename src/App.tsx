import { useState } from "react";
import { PageShell } from "./components/SiteChrome";
import type { AnalysisSession } from "./domain/contracts";
import { AnalyzePage } from "./pages/AnalyzePage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { ResultsPage } from "./pages/ResultsPage";
import {
  NotFoundPage,
  OpenSourcePage,
  PrivacyPage,
  TermsPage,
} from "./pages/StaticPages";
import { usePath } from "./router";

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/analyze": "Analyze privately",
  "/results": "Analysis results",
  "/history": "Encrypted local history",
  "/methodology": "Accuracy and methodology",
  "/privacy": "Privacy",
  "/terms": "Terms and limitations",
  "/open-source": "Open source",
};

function App() {
  const path = usePath();
  const [session, setSession] = useState<AnalysisSession>();
  const [sourceFiles, setSourceFiles] = useState<ReadonlyArray<File>>([]);

  let page;
  switch (path) {
    case "/":
      page = <HomePage />;
      break;
    case "/analyze":
      page = (
        <AnalyzePage
          onComplete={(nextSession, files) => {
            setSession(nextSession);
            setSourceFiles(files);
          }}
        />
      );
      break;
    case "/results":
      page = (
        <ResultsPage
          session={session}
          sourceFiles={sourceFiles}
          onUpdate={setSession}
        />
      );
      break;
    case "/history":
      page = (
        <HistoryPage
          onOpen={(nextSession) => {
            setSession(nextSession);
            setSourceFiles([]);
          }}
        />
      );
      break;
    case "/methodology":
      page = <MethodologyPage />;
      break;
    case "/privacy":
      page = <PrivacyPage />;
      break;
    case "/terms":
      page = <TermsPage />;
      break;
    case "/open-source":
      page = <OpenSourcePage />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <PageShell announcement={`Navigated to ${PAGE_NAMES[path] ?? "page not found"}`}>
      {page}
    </PageShell>
  );
}

export default App;
