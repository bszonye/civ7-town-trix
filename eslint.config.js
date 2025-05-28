// eslint.config.js
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    "varsIgnorePattern": "^_",
                    "argsIgnorePattern": "^_",
                }
            ]
        },
        languageOptions: {
            globals: {
                AdvisorySubjectTypes: "readonly",
                Audio: "readonly",
                BuildQueue: "readonly",
                Camera: "readonly",
                Cities: "readonly",
                CityCommandTypes: "readonly",
                CityOperationTypes: "readonly",
                CityOperationsParametersValues: "readonly",
                CityQueryType: "readonly",
                CombatTypes: "readonly",
                Constructibles: "readonly",
                Controls: "readonly",
                CustomEvent: "readonly",
                Database: "readonly",
                DirectionTypes: "readonly",
                DistrictTypes: "readonly",
                Districts: "readonly",
                FeatureTypes: "readonly",
                Game: "readonly",
                GameContext: "readonly",
                GameInfo: "readonly",
                GameplayMap: "readonly",
                GlobalScaling: "readonly",
                GrowthTypes: "readonly",
                HTMLElement: "readonly",
                IndependentRelationship: "readonly",
                Input: "readonly",
                InputActionStatuses: "readonly",
                InputContext: "readonly",
                InterfaceMode: "readonly",
                Loading: "readonly",
                Locale: "readonly",
                MapCities: "readonly",
                MapConstructibles: "readonly",
                MapPlotEffects: "readonly",
                MapUnits: "readonly",
                PlayerIds: "readonly",
                Players: "readonly",
                ProgressionTreeNodeState: "readonly",
                ProjectTypes: "readonly",
                ResourceTypes: "readonly",
                RevealedStates: "readonly",
                RiverTypes: "readonly",
                UI: "readonly",
                UIHTMLCursorTypes: "readonly",
                Units: "readonly",
                Visibility: "readonly",
                WorldUI: "readonly",
                YieldSourceTypes: "readonly",
                YieldTypes: "readonly",
                console: "readonly",
                document: "readonly",
                engine: "readonly",
                localStorage: "readonly",
                requestAnimationFrame: "readonly",
                waitForLayout: "readonly",
                window: "readonly",
            }
        }

    }
];
