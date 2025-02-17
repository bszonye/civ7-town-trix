// eslint.config.js
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    "varsIgnorePattern": "DEBUG",
                    "argsIgnorePattern": "^_",
                }
            ]
        },
        languageOptions: {
            globals: {
                AdvisorySubjectTypes: "readonly",
                Cities: "readonly",
                CityCommandTypes: "readonly",
                CityOperationTypes: "readonly",
                CityOperationsParametersValues: "readonly",
                CityQueryType: "readonly",
                CombatTypes: "readonly",
                Constructibles: "readonly",
                Controls: "readonly",
                DistrictTypes: "readonly",
                Districts: "readonly",
                Game: "readonly",
                GameContext: "readonly",
                GameInfo: "readonly",
                GameplayMap: "readonly",
                GrowthTypes: "readonly",
                IndependentRelationship: "readonly",
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
                YieldTypes: "readonly",
                console: "readonly",
                document: "readonly",
                engine: "readonly",
            }
        }

    }
];
