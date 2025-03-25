export const CanUpgradeToCity = (townID) => {
    const result = Game.CityCommands.canStart(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE }, false);
    return result.Success;
};
export const CanCityConstruct = (cityID, constructible, isPurchase) => {
    if (isPurchase) {
        return Game.CityCommands.canStart(cityID, CityCommandTypes.PURCHASE, { ConstructibleType: constructible.$index }, false);
    }
    else {
        return Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: constructible.$index }, false);
    }
};
export const CanConvertToCity = (townID) => {
    return Game.CityCommands.canStart(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE }, false);
};
export const ConvertToCity = (townID) => {
    const result = CanConvertToCity(townID);
    if (result.Success) {
        Game.CityCommands.sendRequest(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE });
        UI.sendAudioEvent("city-upgrade-confirm");
        return true;
    }
    return false;
};

//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-operations.js.map
