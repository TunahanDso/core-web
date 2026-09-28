"use client";

import { useActionState } from "react";
import { runCodeAction, type PortalRunState } from "@/app/portal/actions";

const initialState: PortalRunState = {};

const samples: Record<string,string> = {
  python: 'print("YTÜ CORE")\nprint(sum(range(1, 11)))',
  javascript: 'console.log("YTÜ CORE");\nconsole.log([1,2,3,4].map(x => x*x));',
  typescript: 'const team: string = "YTÜ CORE";\nconsole.log(team.toUpperCase());',
  c: '#include <stdio.h>\nint main(void){ printf("YTÜ CORE\\\\n"); return 0; }',
  cpp: '#include <iostream>\nint main(){ std::cout << "YTÜ CORE\\\\n"; }',
};

export default function CodeLab({ repositories }: { repositories: Array<Record<string,unknown>> }) {
  const [state, action, pending] = useActionState(runCodeAction,initialState);

  return (
    <div className="portalCodeLab">
      <form action={action} className="portalCodeLabEditor">
        <header>
          <label>
            <span>DİL</span>
            <select
              name="language"
              defaultValue="python"
              onChange={(event) => {
                const form = event.currentTarget.form;
                const editor = form?.elements.namedItem("code") as HTMLTextAreaElement | null;
                if (editor && !editor.dataset.touched) editor.value = samples[event.target.value] || "";
              }}
            >
              <option value="python">Python 3.11</option>
              <option value="javascript">JavaScript / Node</option>
              <option value="typescript">TypeScript / tsx</option>
              <option value="c">C / GCC</option>
              <option value="cpp">C++20 / G++</option>
            </select>
          </label>
          <label>
            <span>REPO BAĞLAMI</span>
            <select name="repositoryId" defaultValue="">
              <option value="">Bağımsız çalışma</option>
              {repositories.map((repo) => (
                <option value={String(repo.id)} key={String(repo.id)}>{String(repo.name)}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={pending}>{pending ? "ÇALIŞIYOR..." : "▶ ÇALIŞTIR"}</button>
        </header>
        <textarea
          name="code"
          defaultValue={samples.python}
          spellCheck={false}
          onChange={(event) => { event.currentTarget.dataset.touched = "1"; }}
        />
      </form>

      <section className="portalCodeTerminal">
        <header>
          <span>CORE RUNNER OUTPUT</span>
          <div>
            {state.durationMs != null ? <small>{state.durationMs} ms</small> : null}
            {state.exitCode != null ? <small>exit {state.exitCode}</small> : null}
          </div>
        </header>
        {state.error ? <pre className="error">{state.error}</pre> : null}
        {state.unavailable ? (
          <div className="portalRunnerUnavailable">
            <b>Sandbox bridge henüz production'da bağlı değil.</b>
            <p>{state.stderr}</p>
          </div>
        ) : null}
        {state.stdout ? <pre className="stdout">{state.stdout}</pre> : null}
        {state.stderr && !state.unavailable ? <pre className="stderr">{state.stderr}</pre> : null}
        {!state.error && !state.stdout && !state.stderr ? (
          <div className="portalTerminalIdle">
            <span>$</span>
            <p>Kodu çalıştırdığında stdout / stderr burada görünecek.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
