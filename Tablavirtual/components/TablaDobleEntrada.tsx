import * as React from "react";
import { IInputs } from "../generated/ManifestTypes";

export interface ITablaDobleEntradaProps {
    context: ComponentFramework.Context<IInputs>;
    countryEnvironment: string;
    riskDaysThreshold: number;
    zoneFieldLogicalName: string;
    version: string;
}

type CategoryType = "SE" | "PCI";
type ExpirationStatus = "sinRiesgo" | "enRiesgo" | "caducadas" | "sinFecha";

interface IWorkOrderRecord {
    id: string;
    name: string;
    jobNo: string;
    zone: string;
    workOrderTypeId: string;
    workOrderTypeName: string;
    seOrPci: CategoryType;
    systemStatus: string;
    subStatus: string;
    serviceAccount: string;
    city: string;
    pdw_mmexpirationdate?: string | null;
    msdyn_timetopromised?: string | null;
}

interface IWorkOrderEvaluated extends IWorkOrderRecord {
    status: ExpirationStatus;
    daysRemaining: number | null;
    targetDateUsed: string | null;
}

interface IFilterOption {
    key: string;
    text: string;
}

interface IStatusBucket {
    sinRiesgo: number;
    enRiesgo: number;
    caducadas: number;
    sinFecha: number;
}

interface IZoneRowData {
    zone: string;
    total: number;
    SE: IStatusBucket;
    PCI: IStatusBucket;
}

interface IDiagnosticInfo {
    timestamp: string;
    durationMs: number;
    queryExecuted: string;
    fallbackQueryUsed: boolean;
    source: "Dataverse WebAPI" | "Mock Local (Fallback)";
    recordsCount: number;
    errorMessage: string | null;
    errorDetails: string | null;
    rawSample: string;
}

interface IDrillDownSelection {
    title: string;
    zone: string | null;
    seOrPci: CategoryType | null;
    status: ExpirationStatus | null;
}

const STATUS_LABELS: Record<ExpirationStatus, string> = {
    sinRiesgo: "Sin riesgo",
    enRiesgo: "En riesgo",
    caducadas: "Caducadas",
    sinFecha: "Sin fecha"
};

const createEmptyBucket = (): IStatusBucket => ({
    sinRiesgo: 0,
    enRiesgo: 0,
    caducadas: 0,
    sinFecha: 0
});

const getEntityString = (entity: object, propertyName: string): string | undefined => {
    const val: unknown = Reflect.get(entity, propertyName);
    if (typeof val === "string" && val.trim().length > 0) {
        return val;
    }
    if (typeof val === "number" || typeof val === "boolean") {
        return String(val);
    }
    return undefined;
};

const formatUnknownError = (err: unknown): { message: string; details: string } => {
    if (err instanceof Error) {
        return {
            message: err.message,
            details: JSON.stringify(
                {
                    name: err.name,
                    message: err.message,
                    stack: err.stack ?? "Sin stack"
                },
                null,
                2
            )
        };
    }
    if (typeof err === "object" && err !== null) {
        const msg = getEntityString(err, "message") ?? "Error devuelto por WebAPI";
        try {
            return {
                message: msg,
                details: JSON.stringify(err, null, 2)
            };
        } catch {
            return {
                message: msg,
                details: "No se pudo serializar el objeto de error"
            };
        }
    }
    if (typeof err === "string") {
        return { message: err, details: err };
    }
    return {
        message: "Error desconocido al invocar context.webAPI.retrieveMultipleRecords",
        details: "Sin detalles adicionales"
    };
};

const formatDateDisplay = (isoDate: string | null): string => {
    if (!isoDate) return "Sin fecha";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const generateMockWorkOrders = (): IWorkOrderRecord[] => {
    const records: IWorkOrderRecord[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (days: number): string => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString();
    };

    const dateByStatus: Record<ExpirationStatus, string | null> = {
        sinRiesgo: addDays(15),
        enRiesgo: addDays(3),
        caducadas: addDays(-5),
        sinFecha: null
    };

    const workOrderTypes = [
        { id: "type-mantenimiento", name: "Mantenimiento Preventivo" },
        { id: "type-correctivo", name: "Averia / Correctivo" },
        { id: "type-instalacion", name: "Instalacion" }
    ];

    const clients = [
        "Securitas Direct Espana",
        "Logistica Peninsular S.A.",
        "Centro Comercial Plaza Norte",
        "Hospital Universitario Sur"
    ];

    let counter = 1;
    const pushBatch = (
        zone: string,
        seOrPci: CategoryType,
        status: ExpirationStatus,
        count: number
    ): void => {
        for (let i = 0; i < count; i++) {
            const woType = workOrderTypes[counter % workOrderTypes.length];
            const client = clients[counter % clients.length];
            records.push({
                id: `mock-${counter}`,
                name: `OT-${10000 + counter}`,
                jobNo: `JOB-${5000 + counter}`,
                zone,
                workOrderTypeId: woType.id,
                workOrderTypeName: woType.name,
                seOrPci,
                systemStatus: status === "caducadas" ? "En curso" : "Programada",
                subStatus: status === "caducadas" ? "Pendiente Material" : "Asignada",
                serviceAccount: client,
                city: zone === "Norte" ? "Madrid" : "Sevilla",
                pdw_mmexpirationdate: dateByStatus[status],
                msdyn_timetopromised: dateByStatus[status]
            });
            counter++;
        }
    };

    // Norte (Total 132)
    pushBatch("Norte", "SE", "sinRiesgo", 5);
    pushBatch("Norte", "SE", "enRiesgo", 7);
    pushBatch("Norte", "SE", "caducadas", 7);
    pushBatch("Norte", "SE", "sinFecha", 7);
    pushBatch("Norte", "PCI", "sinRiesgo", 0);
    pushBatch("Norte", "PCI", "enRiesgo", 45);
    pushBatch("Norte", "PCI", "caducadas", 55);
    pushBatch("Norte", "PCI", "sinFecha", 6);

    // Sur (Total 38)
    pushBatch("Sur", "SE", "sinRiesgo", 6);
    pushBatch("Sur", "SE", "enRiesgo", 7);
    pushBatch("Sur", "SE", "caducadas", 7);
    pushBatch("Sur", "SE", "sinFecha", 3);
    pushBatch("Sur", "PCI", "sinRiesgo", 0);
    pushBatch("Sur", "PCI", "enRiesgo", 5);
    pushBatch("Sur", "PCI", "caducadas", 4);
    pushBatch("Sur", "PCI", "sinFecha", 6);

    return records;
};

export const TablaDobleEntrada: React.FC<ITablaDobleEntradaProps> = ({
    context,
    countryEnvironment,
    riskDaysThreshold,
    zoneFieldLogicalName,
    version
}) => {
    const [workOrders, setWorkOrders] = React.useState<IWorkOrderRecord[]>([]);
    const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isMockData, setIsMockData] = React.useState<boolean>(false);

    // Estado para Popup de Diagnostico
    const [isDiagOpen, setIsDiagOpen] = React.useState<boolean>(false);
    const [diagInfo, setDiagInfo] = React.useState<IDiagnosticInfo | null>(null);

    // Estado para Popup de Drill-Down
    const [drillDown, setDrillDown] = React.useState<IDrillDownSelection | null>(null);
    const [drillSearch, setDrillSearch] = React.useState<string>("");

    const dropdownRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Evalua fecha objetivo, dias restantes y estado segun tu regla de negocio
    const evaluateRecord = React.useCallback(
        (entity: IWorkOrderRecord): IWorkOrderEvaluated => {
            const hasSpainDate = Boolean(entity.pdw_mmexpirationdate);
            const targetDateString =
                countryEnvironment === "Espana" && hasSpainDate
                    ? entity.pdw_mmexpirationdate
                    : entity.msdyn_timetopromised;

            let daysRemaining: number | null = null;

            if (targetDateString) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const target = new Date(targetDateString);
                target.setHours(0, 0, 0, 0);

                if (!isNaN(target.getTime())) {
                    const diffTime = target.getTime() - today.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            }

            let status: ExpirationStatus = "sinRiesgo";
            if (daysRemaining === null) {
                status = "sinFecha";
            } else if (daysRemaining < 0) {
                status = "caducadas";
            } else if (daysRemaining <= riskDaysThreshold) {
                status = "enRiesgo";
            }

            return {
                ...entity,
                status,
                daysRemaining,
                targetDateUsed: targetDateString ?? null
            };
        },
        [countryEnvironment, riskDaysThreshold]
    );

    const mapEntitiesToRecords = React.useCallback(
        (entities: unknown[]): IWorkOrderRecord[] => {
            const odataSuffix = "@OData.Community.Display.V1.FormattedValue";
            const formattedZoneKey = `${zoneFieldLogicalName}${odataSuffix}`;
            const defaultTerritoryKey = `_msdyn_serviceterritory_value${odataSuffix}`;
            const formattedBuKey = `_owningbusinessunit_value${odataSuffix}`;
            const formattedTypeKey = `_msdyn_workordertype_value${odataSuffix}`;
            const formattedSePciKey = `pdw_seorpci${odataSuffix}`;
            const formattedSysStatusKey = `msdyn_systemstatus${odataSuffix}`;
            const formattedSubStatusKey = `_msdyn_substatus_value${odataSuffix}`;
            const formattedAccountKey = `_msdyn_serviceaccount_value${odataSuffix}`;

            return entities.map((ent: unknown, idx: number) => {
                const rawEnt = ent as object;

                const zoneName =
                    getEntityString(rawEnt, formattedZoneKey) ??
                    getEntityString(rawEnt, zoneFieldLogicalName) ??
                    getEntityString(rawEnt, defaultTerritoryKey) ??
                    getEntityString(rawEnt, "msdyn_stateorprovince") ??
                    getEntityString(rawEnt, formattedBuKey) ??
                    "Sin Zona";

                const typeId =
                    getEntityString(rawEnt, "_msdyn_workordertype_value") ?? "sin-tipo";
                const typeName =
                    getEntityString(rawEnt, formattedTypeKey) ?? "Sin Tipo";

                const rawSePci = (
                    getEntityString(rawEnt, formattedSePciKey) ??
                    getEntityString(rawEnt, "pdw_seorpci") ??
                    "SE"
                ).toUpperCase();
                const seOrPci: CategoryType = rawSePci.includes("PCI") ? "PCI" : "SE";

                return {
                    id: getEntityString(rawEnt, "msdyn_workorderid") ?? `row-${idx}`,
                    name: getEntityString(rawEnt, "msdyn_name") ?? `OT-${idx + 1}`,
                    jobNo: getEntityString(rawEnt, "pdw_mmjobno") ?? "-",
                    zone: zoneName,
                    workOrderTypeId: typeId,
                    workOrderTypeName: typeName,
                    seOrPci,
                    systemStatus:
                        getEntityString(rawEnt, formattedSysStatusKey) ??
                        getEntityString(rawEnt, "msdyn_systemstatus") ??
                        "-",
                    subStatus:
                        getEntityString(rawEnt, formattedSubStatusKey) ??
                        getEntityString(rawEnt, "_msdyn_substatus_value") ??
                        "-",
                    serviceAccount:
                        getEntityString(rawEnt, formattedAccountKey) ??
                        getEntityString(rawEnt, "_msdyn_serviceaccount_value") ??
                        "-",
                    city: getEntityString(rawEnt, "msdyn_city") ?? "-",
                    pdw_mmexpirationdate:
                        getEntityString(rawEnt, "pdw_mmexpirationdate") ?? null,
                    msdyn_timetopromised:
                        getEntityString(rawEnt, "msdyn_timetopromised") ?? null
                };
            });
        },
        [zoneFieldLogicalName]
    );

    const fetchWorkOrders = React.useCallback(async () => {
        setIsLoading(true);
        const startTime = Date.now();

        const baseSelectFields = [
            "msdyn_workorderid",
            "msdyn_name",
            "pdw_mmjobno",
            "_msdyn_workordertype_value",
            "pdw_seorpci",
            "pdw_mmexpirationdate",
            "msdyn_timetopromised",
            "_msdyn_serviceterritory_value",
            "msdyn_stateorprovince",
            "msdyn_city",
            "_owningbusinessunit_value",
            "msdyn_systemstatus",
            "_msdyn_substatus_value",
            "_msdyn_serviceaccount_value"
        ];

        if (!baseSelectFields.includes(zoneFieldLogicalName)) {
            baseSelectFields.push(zoneFieldLogicalName);
        }

        const primaryQuery = `?$select=${baseSelectFields.join(",")}&$filter=statecode eq 0`;

        try {
            const response = await context.webAPI.retrieveMultipleRecords(
                "msdyn_workorder",
                primaryQuery
            );
            const mapped = mapEntitiesToRecords(response.entities);
            const sampleEntities = response.entities.slice(0, 5);

            setWorkOrders(mapped);
            setIsMockData(false);
            setDiagInfo({
                timestamp: new Date().toLocaleTimeString(),
                durationMs: Date.now() - startTime,
                queryExecuted: primaryQuery,
                fallbackQueryUsed: false,
                source: "Dataverse WebAPI",
                recordsCount: response.entities.length,
                errorMessage: null,
                errorDetails: null,
                rawSample: JSON.stringify(sampleEntities, null, 2)
            });
        } catch (primaryErr: unknown) {
            const formattedPrimaryErr = formatUnknownError(primaryErr);

            // Intento secundario sin $select por si algun campo personalizado no existe en el entorno
            const fallbackQuery = "?$filter=statecode eq 0&$top=500";
            try {
                const fallbackResponse = await context.webAPI.retrieveMultipleRecords(
                    "msdyn_workorder",
                    fallbackQuery
                );
                const mappedFallback = mapEntitiesToRecords(fallbackResponse.entities);
                const sampleFallback = fallbackResponse.entities.slice(0, 5);

                setWorkOrders(mappedFallback);
                setIsMockData(false);
                setDiagInfo({
                    timestamp: new Date().toLocaleTimeString(),
                    durationMs: Date.now() - startTime,
                    queryExecuted: `${fallbackQuery} (Fallback tras fallo en $select)`,
                    fallbackQueryUsed: true,
                    source: "Dataverse WebAPI",
                    recordsCount: fallbackResponse.entities.length,
                    errorMessage: `Aviso en consulta primaria: ${formattedPrimaryErr.message}`,
                    errorDetails: formattedPrimaryErr.details,
                    rawSample: JSON.stringify(sampleFallback, null, 2)
                });
            } catch (secondaryErr: unknown) {
                const formattedSecondaryErr = formatUnknownError(secondaryErr);
                const mock = generateMockWorkOrders();

                setWorkOrders(mock);
                setIsMockData(true);
                setDiagInfo({
                    timestamp: new Date().toLocaleTimeString(),
                    durationMs: Date.now() - startTime,
                    queryExecuted: primaryQuery,
                    fallbackQueryUsed: true,
                    source: "Mock Local (Fallback)",
                    recordsCount: mock.length,
                    errorMessage: formattedPrimaryErr.message,
                    errorDetails: `--- ERROR CONSULTA PRIMARIA ---\n${formattedPrimaryErr.details}\n\n--- ERROR CONSULTA SECUNDARIA ---\n${formattedSecondaryErr.details}`,
                    rawSample: JSON.stringify(mock.slice(0, 3), null, 2)
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [context.webAPI, zoneFieldLogicalName, mapEntitiesToRecords]);

    React.useEffect(() => {
        void fetchWorkOrders();
    }, [fetchWorkOrders]);

    const workOrderTypeOptions: IFilterOption[] = React.useMemo(() => {
        const map = new Map<string, string>();
        workOrders.forEach((wo) => {
            if (!map.has(wo.workOrderTypeId)) {
                map.set(wo.workOrderTypeId, wo.workOrderTypeName);
            }
        });
        return Array.from(map.entries())
            .map(([key, text]) => ({ key, text }))
            .sort((a, b) => a.text.localeCompare(b.text));
    }, [workOrders]);

    const toggleWorkOrderType = (key: string): void => {
        setSelectedTypes((prev) =>
            prev.includes(key)
                ? prev.filter((itemKey) => itemKey !== key)
                : [...prev, key]
        );
    };

    const selectedSummaryText = React.useMemo(() => {
        if (selectedTypes.length === 0) {
            return "Tipo de Orden de trabajo (seleccion multiple)";
        }
        const names = workOrderTypeOptions
            .filter((opt) => selectedTypes.includes(opt.key))
            .map((opt) => opt.text);
        return names.join(", ");
    }, [selectedTypes, workOrderTypeOptions]);

    // Ordenes evaluadas y filtradas por Tipo de OT
    const evaluatedWorkOrders: IWorkOrderEvaluated[] = React.useMemo(() => {
        const list =
            selectedTypes.length === 0
                ? workOrders
                : workOrders.filter((wo) => selectedTypes.includes(wo.workOrderTypeId));
        return list.map((wo) => evaluateRecord(wo));
    }, [workOrders, selectedTypes, evaluateRecord]);

    const { rows, totals } = React.useMemo(() => {
        const zoneMap = new Map<string, IZoneRowData>();
        const grandTotals: IZoneRowData = {
            zone: "Totales",
            total: 0,
            SE: createEmptyBucket(),
            PCI: createEmptyBucket()
        };

        evaluatedWorkOrders.forEach((wo) => {
            let row = zoneMap.get(wo.zone);
            if (!row) {
                row = {
                    zone: wo.zone,
                    total: 0,
                    SE: createEmptyBucket(),
                    PCI: createEmptyBucket()
                };
                zoneMap.set(wo.zone, row);
            }

            row.total += 1;
            row[wo.seOrPci][wo.status] += 1;

            grandTotals.total += 1;
            grandTotals[wo.seOrPci][wo.status] += 1;
        });

        const sortedRows = Array.from(zoneMap.values()).sort((a, b) =>
            a.zone.localeCompare(b.zone)
        );

        return { rows: sortedRows, totals: grandTotals };
    }, [evaluatedWorkOrders]);

    // Filtrado de registros para el Popup de Drill-Down
    const drillDownRecords: IWorkOrderEvaluated[] = React.useMemo(() => {
        if (!drillDown) return [];
        const query = drillSearch.trim().toLowerCase();

        return evaluatedWorkOrders.filter((wo) => {
            if (drillDown.zone !== null && wo.zone !== drillDown.zone) {
                return false;
            }
            if (drillDown.seOrPci !== null && wo.seOrPci !== drillDown.seOrPci) {
                return false;
            }
            if (drillDown.status !== null && wo.status !== drillDown.status) {
                return false;
            }
            if (query.length > 0) {
                const haystack = `${wo.name} ${wo.jobNo} ${wo.serviceAccount} ${wo.workOrderTypeName} ${wo.subStatus} ${wo.city}`.toLowerCase();
                return haystack.includes(query);
            }
            return true;
        });
    }, [drillDown, drillSearch, evaluatedWorkOrders]);

    const openDrillDown = (
        zone: string | null,
        seOrPci: CategoryType | null,
        status: ExpirationStatus | null,
        count: number
    ): void => {
        if (count <= 0) return;
        const zoneLabel = zone ?? "Todas las Zonas";
        const catLabel = seOrPci ? ` | ${seOrPci}` : "";
        const statusLabel = status ? ` | ${STATUS_LABELS[status]}` : "";

        setDrillSearch("");
        setDrillDown({
            title: `${zoneLabel}${catLabel}${statusLabel}`,
            zone,
            seOrPci,
            status
        });
    };

    const handleOpenWorkOrderForm = (workOrderId: string): void => {
        if (workOrderId.startsWith("mock-")) {
            return;
        }
        void context.navigation.openForm({
            entityName: "msdyn_workorder",
            entityId: workOrderId
        });
    };

    const renderCellButton = (
        zone: string | null,
        seOrPci: CategoryType,
        status: ExpirationStatus,
        count: number,
        pillClass: string
    ): React.ReactNode => {
        if (count <= 0) {
            return <span className="sec-tv-zero">0</span>;
        }
        return (
            <button
                type="button"
                className={`sec-tv-pill-btn ${pillClass}`}
                title="Hacer clic para ver el listado de ordenes"
                onClick={() => openDrillDown(zone, seOrPci, status, count)}
            >
                {count}
            </button>
        );
    };

    const dateFieldUsed =
        countryEnvironment === "Espana"
            ? "pdw_mmexpirationdate"
            : "msdyn_timetopromised";

    return (
        <div className="sec-tv-container">
            <div className="sec-tv-header-card">
                <div className="sec-tv-title-group">
                    <h2 className="sec-tv-title">Control de Ordenes de Trabajo</h2>
                    <div className="sec-tv-subtitle">
                        <span>Distribucion por Zona, Especialidad (SE / PCI) y Vencimiento</span>
                        <button
                            type="button"
                            className={
                                isMockData
                                    ? "sec-tv-status-badge sec-tv-badge-mock"
                                    : "sec-tv-status-badge sec-tv-badge-live"
                            }
                            onClick={() => setIsDiagOpen(true)}
                            title="Ver diagnostico de conexion y datos recibidos"
                        >
                            {isMockData
                                ? "Modo Demo Local (Ver causa)"
                                : `Datos Reales (${workOrders.length})`}
                        </button>
                    </div>
                </div>

                <div className="sec-tv-filter-bar">
                    <div className="sec-tv-filter-label-box">Filtro</div>

                    <div className="sec-tv-multiselect" ref={dropdownRef}>
                        <button
                            type="button"
                            className="sec-tv-multiselect-trigger"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                        >
                            <span
                                className={
                                    selectedTypes.length === 0
                                        ? "sec-tv-multiselect-placeholder"
                                        : "sec-tv-multiselect-value"
                                }
                            >
                                {selectedSummaryText}
                            </span>
                            <span className="sec-tv-multiselect-chevron">v</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="sec-tv-multiselect-menu">
                                {workOrderTypeOptions.length === 0 ? (
                                    <div className="sec-tv-multiselect-empty">
                                        Sin opciones disponibles
                                    </div>
                                ) : (
                                    workOrderTypeOptions.map((opt) => {
                                        const isChecked = selectedTypes.includes(opt.key);
                                        return (
                                            <label
                                                key={opt.key}
                                                className="sec-tv-multiselect-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() =>
                                                        toggleWorkOrderType(opt.key)
                                                    }
                                                />
                                                <span>{opt.text}</span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {selectedTypes.length > 0 && (
                        <button
                            type="button"
                            className="sec-tv-clear-btn"
                            onClick={() => setSelectedTypes([])}
                        >
                            Limpiar ({selectedTypes.length})
                        </button>
                    )}

                    <button
                        type="button"
                        className="sec-tv-diag-btn"
                        onClick={() => setIsDiagOpen(true)}
                        title="Abrir inspector de datos y errores de WebAPI"
                    >
                        Diagnostico API
                    </button>

                    <button
                        type="button"
                        title="Actualizar datos"
                        aria-label="Actualizar datos"
                        onClick={() => void fetchWorkOrders()}
                        className="sec-tv-refresh-btn"
                    >
                        R
                    </button>
                </div>
            </div>

            <div className="sec-tv-table-card">
                {isLoading ? (
                    <div className="sec-tv-loading">
                        <div className="sec-tv-spinner" />
                        <span>Cargando ordenes de trabajo...</span>
                    </div>
                ) : (
                    <div className="sec-tv-table-scroll">
                        <table className="sec-tv-matrix-table">
                            <thead>
                                <tr className="sec-tv-thead-group">
                                    <th className="sec-tv-th-empty" colSpan={2}></th>
                                    <th className="sec-tv-th-se" colSpan={4}>
                                        SE
                                    </th>
                                    <th className="sec-tv-th-pci" colSpan={4}>
                                        PCI
                                    </th>
                                </tr>
                                <tr className="sec-tv-thead-sub">
                                    <th className="sec-tv-th-zone">Zona</th>
                                    <th className="sec-tv-th-total">Total</th>
                                    <th className="sec-tv-th-status sec-tv-status-ok">
                                        Sin riesgo
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-warn">
                                        En riesgo
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-danger">
                                        Caducadas
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-none sec-tv-divider-right">
                                        Sin fecha
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-ok">
                                        Sin riesgo
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-warn">
                                        En riesgo
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-danger">
                                        Caducadas
                                    </th>
                                    <th className="sec-tv-th-status sec-tv-status-none">
                                        Sin fecha
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="sec-tv-empty-row">
                                            No se encontraron ordenes con los filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.zone} className="sec-tv-tr-body">
                                            <td className="sec-tv-td-zone">{row.zone}</td>
                                            <td className="sec-tv-td-total">
                                                <button
                                                    type="button"
                                                    className="sec-tv-total-link"
                                                    onClick={() =>
                                                        openDrillDown(
                                                            row.zone,
                                                            null,
                                                            null,
                                                            row.total
                                                        )
                                                    }
                                                >
                                                    {row.total}
                                                </button>
                                            </td>

                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "SE",
                                                    "sinRiesgo",
                                                    row.SE.sinRiesgo,
                                                    "sec-tv-pill-ok"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "SE",
                                                    "enRiesgo",
                                                    row.SE.enRiesgo,
                                                    "sec-tv-pill-warn"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "SE",
                                                    "caducadas",
                                                    row.SE.caducadas,
                                                    "sec-tv-pill-danger"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num sec-tv-divider-right">
                                                {renderCellButton(
                                                    row.zone,
                                                    "SE",
                                                    "sinFecha",
                                                    row.SE.sinFecha,
                                                    "sec-tv-pill-none"
                                                )}
                                            </td>

                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "PCI",
                                                    "sinRiesgo",
                                                    row.PCI.sinRiesgo,
                                                    "sec-tv-pill-ok"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "PCI",
                                                    "enRiesgo",
                                                    row.PCI.enRiesgo,
                                                    "sec-tv-pill-warn"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "PCI",
                                                    "caducadas",
                                                    row.PCI.caducadas,
                                                    "sec-tv-pill-danger"
                                                )}
                                            </td>
                                            <td className="sec-tv-td-num">
                                                {renderCellButton(
                                                    row.zone,
                                                    "PCI",
                                                    "sinFecha",
                                                    row.PCI.sinFecha,
                                                    "sec-tv-pill-none"
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="sec-tv-tfoot-row">
                                    <td className="sec-tv-td-zone">Totales</td>
                                    <td className="sec-tv-td-total">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(null, null, null, totals.total)
                                            }
                                        >
                                            {totals.total}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "SE",
                                                    "sinRiesgo",
                                                    totals.SE.sinRiesgo
                                                )
                                            }
                                        >
                                            {totals.SE.sinRiesgo}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "SE",
                                                    "enRiesgo",
                                                    totals.SE.enRiesgo
                                                )
                                            }
                                        >
                                            {totals.SE.enRiesgo}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "SE",
                                                    "caducadas",
                                                    totals.SE.caducadas
                                                )
                                            }
                                        >
                                            {totals.SE.caducadas}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num sec-tv-divider-right">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "SE",
                                                    "sinFecha",
                                                    totals.SE.sinFecha
                                                )
                                            }
                                        >
                                            {totals.SE.sinFecha}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "PCI",
                                                    "sinRiesgo",
                                                    totals.PCI.sinRiesgo
                                                )
                                            }
                                        >
                                            {totals.PCI.sinRiesgo}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "PCI",
                                                    "enRiesgo",
                                                    totals.PCI.enRiesgo
                                                )
                                            }
                                        >
                                            {totals.PCI.enRiesgo}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "PCI",
                                                    "caducadas",
                                                    totals.PCI.caducadas
                                                )
                                            }
                                        >
                                            {totals.PCI.caducadas}
                                        </button>
                                    </td>
                                    <td className="sec-tv-td-num">
                                        <button
                                            type="button"
                                            className="sec-tv-total-link"
                                            onClick={() =>
                                                openDrillDown(
                                                    null,
                                                    "PCI",
                                                    "sinFecha",
                                                    totals.PCI.sinFecha
                                                )
                                            }
                                        >
                                            {totals.PCI.sinFecha}
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <div className="sec-tv-footer-meta">
                    <span className="sec-tv-rule-info">
                        Regla fecha: {dateFieldUsed} | Umbral riesgo: &lt;= {riskDaysThreshold} dias | Agrupacion zona: {zoneFieldLogicalName}
                    </span>
                    <span className="sec-tv-version">v{version}</span>
                </div>
            </div>

            {/* POPUP DE DRILL-DOWN (LISTADO DE ORDENES DE TRABAJO) */}
            {drillDown !== null && (
                <div
                    className="sec-tv-modal-overlay"
                    onClick={() => setDrillDown(null)}
                >
                    <div
                        className="sec-tv-modal-window sec-tv-modal-large"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sec-tv-modal-header">
                            <div>
                                <h3 className="sec-tv-modal-title">
                                    Detalle de Ordenes: {drillDown.title}
                                </h3>
                                <span className="sec-tv-modal-subtitle">
                                    Mostrando {drillDownRecords.length} orden(es) de trabajo
                                </span>
                            </div>
                            <button
                                type="button"
                                className="sec-tv-modal-close"
                                onClick={() => setDrillDown(null)}
                            >
                                X
                            </button>
                        </div>

                        <div className="sec-tv-modal-toolbar">
                            <input
                                type="text"
                                className="sec-tv-search-input"
                                placeholder="Buscar por N OT, Job No, Cliente, Tipo, Subestado o Ciudad..."
                                value={drillSearch}
                                onChange={(e) => setDrillSearch(e.target.value)}
                            />
                        </div>

                        <div className="sec-tv-modal-body">
                            <table className="sec-tv-drill-table">
                                <thead>
                                    <tr>
                                        <th>N OT</th>
                                        <th>Job No</th>
                                        <th>Cliente</th>
                                        <th>Tipo OT</th>
                                        <th>Esp.</th>
                                        <th>Estado / Subestado</th>
                                        <th>Zona / Ciudad</th>
                                        <th>Fecha Limite</th>
                                        <th>Dias</th>
                                        <th>Accion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drillDownRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="sec-tv-empty-row">
                                                No hay ordenes que coincidan con la busqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        drillDownRecords.map((wo) => {
                                            let badgeClass = "sec-tv-pill-none";
                                            if (wo.status === "sinRiesgo") {
                                                badgeClass = "sec-tv-pill-ok";
                                            } else if (wo.status === "enRiesgo") {
                                                badgeClass = "sec-tv-pill-warn";
                                            } else if (wo.status === "caducadas") {
                                                badgeClass = "sec-tv-pill-danger";
                                            }

                                            const daysText =
                                                wo.daysRemaining === null
                                                    ? "S/F"
                                                    : `${wo.daysRemaining} d`;

                                            return (
                                                <tr key={wo.id}>
                                                    <td className="sec-tv-fw-bold">{wo.name}</td>
                                                    <td>{wo.jobNo}</td>
                                                    <td>{wo.serviceAccount}</td>
                                                    <td>{wo.workOrderTypeName}</td>
                                                    <td>
                                                        <span
                                                            className={
                                                                wo.seOrPci === "PCI"
                                                                    ? "sec-tv-tag-pci"
                                                                    : "sec-tv-tag-se"
                                                            }
                                                        >
                                                            {wo.seOrPci}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {wo.systemStatus} / {wo.subStatus}
                                                    </td>
                                                    <td>
                                                        {wo.zone} ({wo.city})
                                                    </td>
                                                    <td>{formatDateDisplay(wo.targetDateUsed)}</td>
                                                    <td>
                                                        <span className={badgeClass}>
                                                            {daysText}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="sec-tv-open-wo-btn"
                                                            disabled={wo.id.startsWith("mock-")}
                                                            onClick={() =>
                                                                handleOpenWorkOrderForm(wo.id)
                                                            }
                                                            title={
                                                                wo.id.startsWith("mock-")
                                                                    ? "Registro de demostracion"
                                                                    : "Abrir formulario de la OT"
                                                            }
                                                        >
                                                            Abrir OT
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* POPUP DE DIAGNOSTICO API Y DATOS CRUDOS */}
            {isDiagOpen && (
                <div
                    className="sec-tv-modal-overlay"
                    onClick={() => setIsDiagOpen(false)}
                >
                    <div
                        className="sec-tv-modal-window"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sec-tv-modal-header">
                            <div>
                                <h3 className="sec-tv-modal-title">
                                    Diagnostico de WebAPI e Inspector de Datos
                                </h3>
                                <span className="sec-tv-modal-subtitle">
                                    Informacion detallada de la consulta a msdyn_workorder
                                </span>
                            </div>
                            <button
                                type="button"
                                className="sec-tv-modal-close"
                                onClick={() => setIsDiagOpen(false)}
                            >
                                X
                            </button>
                        </div>

                        <div className="sec-tv-modal-body sec-tv-diag-content">
                            <div className="sec-tv-diag-grid">
                                <div className="sec-tv-diag-box">
                                    <span className="sec-tv-diag-label">Origen de Datos</span>
                                    <span className="sec-tv-diag-val">
                                        {diagInfo?.source ?? "N/A"}
                                    </span>
                                </div>
                                <div className="sec-tv-diag-box">
                                    <span className="sec-tv-diag-label">Registros Leidos</span>
                                    <span className="sec-tv-diag-val">
                                        {diagInfo?.recordsCount ?? 0} ({diagInfo?.durationMs ?? 0} ms)
                                    </span>
                                </div>
                                <div className="sec-tv-diag-box">
                                    <span className="sec-tv-diag-label">Parametro Pais</span>
                                    <span className="sec-tv-diag-val">
                                        {countryEnvironment} ({dateFieldUsed})
                                    </span>
                                </div>
                                <div className="sec-tv-diag-box">
                                    <span className="sec-tv-diag-label">Campo Zona</span>
                                    <span className="sec-tv-diag-val">
                                        {zoneFieldLogicalName}
                                    </span>
                                </div>
                            </div>

                            <div className="sec-tv-diag-section">
                                <h4>Consulta OData Ejecutada:</h4>
                                <pre className="sec-tv-code-block">
                                    {diagInfo?.queryExecuted ?? "Sin consulta"}
                                </pre>
                            </div>

                            {diagInfo?.errorMessage ? (
                                <div className="sec-tv-diag-section">
                                    <h4 className="sec-tv-error-title">
                                        Detalle del Error Capturado:
                                    </h4>
                                    <div className="sec-tv-error-banner">
                                        {diagInfo.errorMessage}
                                    </div>
                                    <pre className="sec-tv-code-block sec-tv-code-error">
                                        {diagInfo.errorDetails}
                                    </pre>
                                </div>
                            ) : (
                                <div className="sec-tv-success-banner">
                                    Consulta ejecutada correctamente en Dataverse sin errores.
                                </div>
                            )}

                            <div className="sec-tv-diag-section">
                                <h4>Muestra de Datos Recibidos (Primeros registros JSON):</h4>
                                <pre className="sec-tv-code-block">
                                    {diagInfo?.rawSample ?? "[]"}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};