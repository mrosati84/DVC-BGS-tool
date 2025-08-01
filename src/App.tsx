import { useState } from "react";
import "./App.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale";
import { fetch, ResponseType } from "@tauri-apps/api/http";
import { invoke } from "@tauri-apps/api/tauri";

const CURRENT_TAG = "dvc-bgs-tool-v1.0.9";

function App() {
  const API_DOMAIN = "https://dvc-tool.mrosati.it";
  const [greetMsg, setGreetMsg] = useState("");
  const [loadingDelta, setLoadingDelta] = useState(false);
  const [loadingInf, setLoadingInf] = useState(false);
  const [delta, setDelta] = useState(20);
  const [updateModal, setUpdateModal] = useState(false);
  const [lastVersion, setLastVersion] = useState(false);
  const [downloadLink, setDownloadLink] = useState("");

  const [inf, setInf] = useState(false);
  const [systems, setSystems] = useState<string[]>([]);
  const [missions, setMissions] = useState<any>({});
  const [marketBuy, setMarketBuy] = useState<any>({});
  const [marketSell, setMarketSell] = useState<any>({});
  const [bounties, setBounties] = useState<any>({});
  const [combatBonds, setCombatBonds] = useState<any>({});
  const [navData, setNavData] = useState<any>({});
  const [expandedSystems, setExpandedSystems] = useState<{
    [key: string]: boolean;
  }>({});

  // Set initial dates: endDate to now, startDate to 24 hours ago
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const [startDate, setStartDate] = useState<Date | null>(yesterday);
  const [endDate, setEndDate] = useState<Date | null>(now);

  // Register Italian locale
  registerLocale("it", it);

  async function zipBinds() {
    const n = await invoke("zip_binds");
    console.log(n);
  }

  async function getUpdates() {
    const response = await fetch(
      "https://api.github.com/repos/mrosati84/DVC-BGS-tool/releases/latest",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `DVC BGS Tool/${CURRENT_TAG} Tauri/1.5.4`,
        },
      },
    );
    const data: any = await response.data;

    if (data.tag_name !== CURRENT_TAG) {
      setUpdateModal(true);
      setLastVersion(data.tag_name);
      setDownloadLink(data.html_url);
    }
  }

  async function getDelta() {
    setLoadingDelta(true);
    const response = await fetch(`${API_DOMAIN}/?delta=` + delta, {
      method: "GET",
      timeout: 30,
      responseType: ResponseType.JSON,
    });
    const data = await response.data;

    setInf(false);
    setGreetMsg(data as string);
    setLoadingDelta(false);
  }

  async function activities() {
    setLoadingInf(true);
    setGreetMsg("");
    setInf(true);

    try {
      // Format dates for API requests
      const formatDateForApi = (date: Date | null) => {
        if (!date) return "";
        return date.toISOString();
      };

      const startDateParam = formatDateForApi(startDate);
      const endDateParam = formatDateForApi(endDate);
      const dateParams = `?start_date=${encodeURIComponent(startDateParam)}&end_date=${encodeURIComponent(endDateParam)}`;

      // Systems endpoint doesn't need date parameters
      const systemsRes = await fetch(`${API_DOMAIN}/bgs/systems/`);

      // All other endpoints need date parameters
      const missionsRes = await fetch(
        `${API_DOMAIN}/bgs/missions/${dateParams}`,
      );
      const marketBuyRes = await fetch(
        `${API_DOMAIN}/bgs/market_buy/${dateParams}`,
      );
      const marketSellRes = await fetch(
        `${API_DOMAIN}/bgs/market_sell/${dateParams}`,
      );
      const bountiesRes = await fetch(
        `${API_DOMAIN}/bgs/bounties/${dateParams}`,
      );
      const combatBondsRes = await fetch(
        `${API_DOMAIN}/bgs/combat_bonds/${dateParams}`,
      );
      const navDataRes = await fetch(
        `${API_DOMAIN}/bgs/nav_data/${dateParams}`,
      );

      const systemsData = (await systemsRes.data) as string[];
      const missionsData = await missionsRes.data;
      const marketBuyData = await marketBuyRes.data;
      const marketSellData = await marketSellRes.data;
      const bountiesData = await bountiesRes.data;
      const combatBondsData = await combatBondsRes.data;
      const navDataData = await navDataRes.data;

      setSystems(systemsData as string[]);
      setMissions(missionsData);
      setMarketBuy(marketBuyData);
      setMarketSell(marketSellData);
      setBounties(bountiesData);
      setCombatBonds(combatBondsData);
      setNavData(navDataData);

      // Initialize expanded state for all systems
      const initialExpandedState: { [key: string]: boolean } = {};
      systemsData.forEach((system: string) => {
        initialExpandedState[system] = false;
      });
      setExpandedSystems(initialExpandedState);
    } catch (error) {
      console.error("Error fetching BGS data:", error);
    }

    setLoadingInf(false);
  }

  // Helper function to format credit amounts
  const formatCredits = (creditString: string) => {
    // Ho scoperto che non mi serve riformattare con i punti, le virgole
    // vanno benone
    // return creditString ? creditString.replace(/,/g, ".") : "0";
    return creditString;
  };

  // Helper function to toggle system expansion
  const toggleSystemExpansion = (system: string) => {
    setExpandedSystems((prev) => ({
      ...prev,
      [system]: !prev[system],
    }));
  };

  // Helper function to check if a system has any data
  const hasSystemData = (system: string) => {
    return (
      (missions[system] && Object.keys(missions[system]).length > 0) ||
      (marketBuy[system] && Object.keys(marketBuy[system]).length > 0) ||
      (marketSell[system] && Object.keys(marketSell[system]).length > 0) ||
      (bounties[system] && Object.keys(bounties[system]).length > 0) ||
      (combatBonds[system] && Object.keys(combatBonds[system]).length > 0) ||
      (navData[system] && Object.keys(navData[system]).length > 0)
    );
  };

  // Helper function to get missions data for a system
  const getMissionsData = (system: string) => {
    if (!missions[system]) return [];

    const result: { commander: string; faction: string; influence: number }[] =
      [];

    Object.entries(missions[system]).forEach(([commander, factionData]) => {
      Object.entries(factionData as Record<string, number>).forEach(
        ([faction, influence]) => {
          result.push({ commander, faction, influence });
        },
      );
    });

    return result;
  };

  // Helper function to get market buy data for a system
  const getMarketBuyData = (system: string) => {
    if (!marketBuy[system]) return [];

    const result: { commander: string; station: string; credits: string }[] =
      [];

    Object.entries(marketBuy[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(
        ([station, credits]) => {
          result.push({ commander, station, credits: formatCredits(credits) });
        },
      );
    });

    return result;
  };

  // Helper function to get market sell data for a system
  const getMarketSellData = (system: string) => {
    if (!marketSell[system]) return [];

    const result: { commander: string; station: string; credits: string }[] =
      [];

    Object.entries(marketSell[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(
        ([station, credits]) => {
          result.push({ commander, station, credits: formatCredits(credits) });
        },
      );
    });

    return result;
  };

  // Helper function to get nav data for a system
  const getNavDataData = (system: string) => {
    if (!navData[system]) return [];

    const result: { commander: string; station: string; credits: string }[] =
      [];

    Object.entries(navData[system]).forEach(([commander, stationData]) => {
      Object.entries(stationData as Record<string, string>).forEach(
        ([station, credits]) => {
          result.push({ commander, station, credits: formatCredits(credits) });
        },
      );
    });

    return result;
  };

  // Helper function to get bounties data for a system
  const getBountiesData = (system: string) => {
    if (!bounties[system]) return [];

    const result: { commander: string; credits: string }[] = [];

    Object.entries(bounties[system]).forEach(([commander, credits]) => {
      result.push({ commander, credits: formatCredits(credits as string) });
    });

    return result;
  };

  // Helper function to get bounties data for a system
  const getCombatBondsData = (system: string) => {
    if (!combatBonds[system]) return [];

    const result: { commander: string; credits: string }[] = [];

    Object.entries(combatBonds[system]).forEach(([commander, credits]) => {
      result.push({ commander, credits: formatCredits(credits as string) });
    });

    return result;
  };

  function copyToClipboard(msg: string) {
    navigator.clipboard.writeText("```" + msg + "```");
  }

  return (
    <main onLoad={getUpdates} className="container">
      {updateModal && (
        <>
          <div id="overlay"></div>
          <div id="update-modal">
            <h1>Aggiornamento disponibile</h1>
            <p>
              Versione corrente: <b>{CURRENT_TAG}</b>
            </p>
            <p>
              Ultima versione: <b>{lastVersion}</b>
            </p>
            <button
              onClick={() => {
                const link = document.createElement("a");
                link.href = downloadLink;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <span>Scarica</span>
            </button>
            <button
              onClick={() => {
                setUpdateModal(false);
              }}
              style={{ marginLeft: "1em" }}
            >
              <span>Chiudi</span>
            </button>
          </div>
        </>
      )}
      <img className="logo" src="dvc.png" width={300} alt="" />
      <h1>Gestione BGS</h1>
      <label htmlFor="delta">Scarto influenza: {delta}</label>
      <input
        defaultValue={delta}
        onChange={(e) => setDelta(parseInt(e.target.value))}
        type="range"
        min="1"
        max="100"
        id="delta"
        className="delta"
        name="delta"
      ></input>
      <form className="row">
        <button
          className={greetMsg ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            getDelta();
          }}
          type="submit"
        >
          {loadingDelta ? <span className="loader"></span> : ""}
          <span>Calcola delta</span>
        </button>
        <button
          className={inf ? "active" : ""}
          onClick={(e) => {
            e.preventDefault();
            activities();
          }}
          style={{ marginLeft: "1em" }}
          type="submit"
        >
          {loadingInf ? <span className="loader"></span> : ""}
          <span>Attività CMDRs</span>
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            zipBinds();
          }}
          style={{ marginLeft: "1em" }}
        >
          <span>Salva bindings</span>
        </button>
      </form>
      {greetMsg ? (
        <div>
          <pre>{greetMsg}</pre>
          <button onClick={() => copyToClipboard(greetMsg)}>
            <span>Copia nella clipboard</span>
          </button>
        </div>
      ) : (
        ""
      )}

      {inf && systems.length > 0 && (
        <div className="bgs-summary">
          <h2>Riepilogo Attività BGS</h2>
          <div
            className="date-filters"
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div className="date-filter">
              <label style={{ marginRight: "1em" }} htmlFor="date-from">
                Da:
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                locale="it"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                className="datetime-select"
              />
            </div>
            <div className="date-filter">
              <label style={{ marginRight: "1em" }} htmlFor="date-to">
                A:
              </label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                locale="it"
                dateFormat="dd/MM/yyyy HH:mm"
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                className="datetime-select"
              />
            </div>
          </div>
          <div className="system-list">
            {systems
              .filter((system) => hasSystemData(system))
              .map((system) => (
                <div key={system} className="system-container">
                  <div
                    className={`system-header ${expandedSystems[system] ? "expanded" : ""}`}
                    onClick={() => toggleSystemExpansion(system)}
                  >
                    <h3>{system}</h3>
                    <span className="expand-icon">
                      {expandedSystems[system] ? "▼" : "▶"}
                    </span>
                  </div>

                  {expandedSystems[system] && (
                    <div className="system-details">
                      {/* Bounties Table */}
                      {getBountiesData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Bounties</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Crediti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getBountiesData(system).map((item, index) => (
                                <tr key={`bounty-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.credits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Combat Bonds Table */}
                      {getCombatBondsData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Combat Bonds</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Crediti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getCombatBondsData(system).map((item, index) => (
                                <tr key={`bounty-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.credits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Missions Table */}
                      {getMissionsData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Missioni</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Fazione</th>
                                <th>Influenza</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getMissionsData(system).map((item, index) => (
                                <tr key={`mission-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.faction}</td>
                                  <td>{item.influence}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Market Buy Table */}
                      {getMarketBuyData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Market Buy</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Stazione</th>
                                <th>Crediti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getMarketBuyData(system).map((item, index) => (
                                <tr key={`market-buy-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.station}</td>
                                  <td>{item.credits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Market Sell Table */}
                      {getMarketSellData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Market Sell</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Stazione</th>
                                <th>Crediti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getMarketSellData(system).map((item, index) => (
                                <tr key={`market-sell-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.station}</td>
                                  <td>{item.credits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Nav Data Table */}
                      {getNavDataData(system).length > 0 && (
                        <div className="activity-section">
                          <h4>Nav Data</h4>
                          <table className="bgs-table">
                            <thead>
                              <tr>
                                <th>CMDR</th>
                                <th>Stazione</th>
                                <th>Crediti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getNavDataData(system).map((item, index) => (
                                <tr key={`nav-data-${index}`}>
                                  <td>{item.commander}</td>
                                  <td>{item.station}</td>
                                  <td>{item.credits}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <footer>&copy; 2025 DVC Corp.</footer>
    </main>
  );
}

export default App;
