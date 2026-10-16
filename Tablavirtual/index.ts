import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { TablaDobleEntrada, ITablaDobleEntradaProps } from "./components/TablaDobleEntrada";

const CONTROL_VERSION = "1.0.7";

export class Tablavirtual implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;

    constructor() {
        // Constructor vacio
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        context.mode.trackContainerResize(true);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const rawCountry = context.parameters.countryEnvironment?.raw ?? "Espana";
        const cleanCountry = rawCountry.trim();
        const countryEnvironment =
            cleanCountry.length > 0 && cleanCountry !== "val" ? cleanCountry : "Espana";

        const riskDaysThreshold = context.parameters.riskDaysThreshold?.raw ?? 7;

        const rawZone =
            context.parameters.zoneFieldLogicalName?.raw ?? "_msdyn_serviceterritory_value";
        const cleanZone = rawZone.trim();
        const zoneFieldLogicalName =
            cleanZone.length > 0 && cleanZone !== "val"
                ? cleanZone
                : "_msdyn_serviceterritory_value";

        const props: ITablaDobleEntradaProps = {
            context,
            countryEnvironment,
            riskDaysThreshold,
            zoneFieldLogicalName,
            version: CONTROL_VERSION
        };

        return React.createElement(TablaDobleEntrada, props);
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        // Limpieza si es necesaria
    }
}