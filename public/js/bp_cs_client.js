cs_client = {

    getText: function (label) {
      if (!label) return ''
      label = label.replace(/_/g, ' ')
      var lc = label.toLowerCase()
      var words = lc.split(/\s/)
      var ccWords = words.map(function (word) { return String(word.charAt(0)).toUpperCase() + word.slice(1) })
      return ccWords.join(' ')
    }
  , getCountry: function (code) {
      var countries = {
          '124' : 'Canada'
        , '840' : 'United States'
      }
      return countries[code] || code || ''
    }
  , getDataPool: function (dp_gln) {
      var data_pools = {
          '0068780850147' : 'ECCnet'
        , '7540000000530' : 'GS1 Canada'
        , '8380160030003' : '1WS Test'
        , '0838016003001' : '1WS'
        , '0850522001050' : 'FSE'
        , '1100001011285' : 'iTradeNetwork'
      }
      return data_pools[dp_gln] || dp_gln || ''
  }
  , getNutrient: function (code) {
      var nutrients = {
          'ENER'     : 'Calories'
        , 'ENER-'    : 'Calories'
        , 'ENERPF'   : 'Calories from Fat'
        , 'BIOT'     : 'Biotin'
        , 'NA'       : 'Sodium'
        , 'CHO-'     : 'Total Carbohydrate'
        , 'CHOL-'    : 'Cholesterol'
        , 'K'        : 'Potassium'
        , 'PRO-'     : 'Protein'
        , 'FAT'      : 'Total Fat'
        , 'FASAT'    : 'Saturated Fat'
        , 'FATRN'    : 'Trans Fat'
        , 'FATNLEA'  : 'Fat'
        , 'FAPU'     : 'Polyunsaturated Fat'
        , 'FAMS'     : 'Monounsaturated Fat'
        , 'SUGAR'    : 'Sugar'
        , 'SUGAR-'   : 'Sugar'
        , 'FIB-'     : 'Fiber'
        , 'FIBTG'    : 'Fiber'
        , 'FIBTSW'   : 'Fiber'
        , 'VITA-'    : 'Vitamin A'
        , 'VITC'     : 'Vitamin C'
        , 'VITC-'    : 'Vitamin C'
        , 'CA'       : 'Calcium'
        , 'FE'       : 'Iron'
        , 'VITD-'    : 'Vitamin D'
        , 'VITE-'    : 'Vitamin E'
        , 'VITK'     : 'Vitamin K'
        , 'THIA'     : 'Thiamin'
        , 'RIBF'     : 'Riboflavin'
        , 'NIAEQ'    : 'Niacin'
        , 'VITB6-'   : 'Vitamin B6'
        , 'FOL'      : 'Folate'
        , 'VITB12'   : 'Vitamin B12'
        , 'PANTAC'   : 'Pantothenic Acid'
        , 'P'        : 'Phosphorus'
        , 'ID'       : 'Iodine'
        , 'MG'       : 'Magnesium'
        , 'ZN'       : 'Zinc'
        , 'SE'       : 'Selenium'
        , 'CU'       : 'Copper'
        , 'MN'       : 'Manganese'
        , 'CR'       : 'Chromium'
        , 'MO'       : 'Molybdenum'
        , 'CLD'      : 'Chloride'
      }
      return nutrients[code] || code || ''
    }
  , getAllergen: function (code) {
      var allergens = {
          'AC' : 'Crustacean'
        , 'AE' : 'Eggs'
        , 'AF' : 'Fish'
        , 'AM' : 'Milk'
        , 'AN' : 'Tree Nuts'
        , 'AP' : 'Peanuts'
        , 'AS' : 'Sesame'
        , 'AX' : 'Gluten'
        , 'AY' : 'Soybean'
        , 'UM' : 'Shellfish'
        , 'UW' : 'Wheat'
      }
      return allergerns[code] || code || ''
    }
  , getMeasurement: function (measurements, prop) {
      var measure = measurements
      if (prop) measure = measurements[prop]
      if (!measure) return ''

      var values = measure.measurementValue
      if (!Array.isArray(values)) values = [values]
      return values[0].value + ' ' + values[0].unitOfMeasure
    }
  , getTextForLang: function (list, lang) {
      if (!list) return ''
      lang = lang || 'en'
      if (!Array.isArray(list)) list = [list]
      var result = list.reduce(function(text, e) {
        if (text) return text
        if (e.language && e.language.languageISOCode == lang) {
          if (e.text) return e.text
          if (e.shortText) return e.shortText
          if (e.longText) return e.longText
        }
        return text
      }, '')
      return result
    }
  , transform: function (item, lang) {

      if (!item) return {}

      var self = this
      var start = Date.now()

      var orig = item.tradeItem

      var result = {}

      result.recipient = item.recipient
      result.provider  = item.provider
      result.gtin      = item.gtin
      result.tm        = item.tm
      result.tm_sub    = item.tm_sub
      result.gpc       = item.gpc
      result.href      = item.href

      result.source_dp = self.getDataPool(item.source_dp)

      if (item.fetch_type) result.fetch_type = item.fetch_type

      result.last_modified = new Date(item.modified_ts).toString()

      result.unitDescriptor = self.getText(orig.tradeItemUnitDescriptor)

      if (orig.tradeItemIdentification) {
        var addlId = orig.tradeItemIdentification.additionalTradeItemIdentification
        if (addlId) {
          result.additionalTradeItemIdentification = addlId.map(function (addl) { 
            return {
              manufacturerProductNumber : addl.additionalTradeItemIdentificationValue
              , type                    : self.getText(addl.additionalTradeItemIdentificationType)
            }
          })
        }
      }

      if (orig.nextLowerLevelTradeItemInformation) {
        var children = orig.nextLowerLevelTradeItemInformation.childTradeItem
        if (children) {
          result.childGtin = children.map(function (child) { return child.tradeItemIdentification.gtin })
        }
      }

      var tiInfo = orig.tradeItemInformation
      if (tiInfo) {

        if (tiInfo.informationProviderOfTradeItem) {
          result.informationProvider = tiInfo.informationProviderOfTradeItem.nameOfInformationProvider
        }

        var tiDesc             = tiInfo.tradeItemDescriptionInformation
        if (tiDesc) {
          result.brandName             = tiDesc.brandName
          result.productName           = self.getTextForLang(tiDesc.tradeItemDescription, lang)
          result.additionalDescription = self.getTextForLang(tiDesc.additionalTradeItemDescription, lang)
          result.shortDescription      = self.getTextForLang(tiDesc.descriptionShort && tiDesc.descriptionShort.description, lang)
          result.functionalName        = self.getTextForLang(tiDesc.functionalName && tiDesc.functionalName.description, lang)

          var tiExtInfo = tiDesc.tradeItemExternalInformation
          if (tiExtInfo) {
            result.images = tiExtInfo.map(function (e) {
              return {
                url: e.uniformResourceIdentifier
                , type: e.typeOfInformation
              }
            })
          }
        }
        
        var tiNeutral              = tiInfo.tradingPartnerNeutralTradeItemInformation
        if (tiNeutral) {
          if (tiNeutral.tradeItemCountryOfOrigin) {
            result.countryOfOrigin = tiNeutral.tradeItemCountryOfOrigin.map(function (e) { return self.getCountry(e.countryISOCode) })
          }
          if (tiNeutral.brandOwnerOfTradeItem) {
            result.brandOwner = tiNeutral.brandOwnerOfTradeItem.nameOfBrandOwner
          }
          if (tiNeutral.manufacturerOfTradeItem) {
            result.manufacturer = tiNeutral.manufacturerOfTradeItem.map(function (e) { return e.nameOfManufacturer })
          }
          if (tiNeutral.tradeItemHandlingInformation) {
            result.ShelfLifefromProduction = tiNeutral.tradeItemHandlingInformation.minimumTradeItemLifespanFromTimeOfProduction
          }

          var tiMeasure = tiNeutral.tradeItemMeasurements
          if (tiMeasure) {
            result.measurements = {}
            var props = ['grossWeight', 'netWeight', 'netContent', 'height', 'width', 'depth']
            props.forEach(function (prop) {
              result.measurements[prop] = self.getMeasurement(tiMeasure, prop)
            })
          }

          var tempInfo = tiNeutral.tradeItemTemperatureInformation
          if (tempInfo) {
            result.temperatureInformation = {}
            result.temperatureInformation.StorageTempMin = self.getMeasurement(tempInfo, 'storageHandlingTemperatureMinimum')
            result.temperatureInformation.StorageTempMax = self.getMeasurement(tempInfo, 'storageHandlingTemperatureMaximum')
          }

          if (tiNeutral.marketingInformation) {
            result.marketingMessage = self.getTextForLang(tiNeutral.marketingInformation.tradeItemMarketingMessage, lang)
          }

        } // end tiNeutral
      } // end tiInfo

      var food_ext = orig.extension && orig.extension.foodAndBeverageTradeItemExtension

      var extInfo = food_ext && food_ext.tradeItemExternalInformation
      if (extInfo) {
        if (!result.images) result.images = []
        var foodUrls = extInfo.map(function (e) {
          return {
            url: e.uniformResourceIdentifier
            , type: e.typeOfInformation
          }
        })
        result.images = result.images.concat(foodUrls)
      }

      var mktInfo = food_ext && food_ext.foodAndBeverageMarketingInformationExtension
      if (mktInfo) {
        if (mktInfo.servingSuggestion) {
          result.servingSuggestion = self.getTextForLang(mktInfo.servingSuggestion, lang)
        }
      }

      var fbInfoList = food_ext && food_ext.foodAndBeverageInformation
      if (fbInfoList) {

        result.foodAndBeverageInformation = fbInfoList.map(function (fbInfo) {

          var food = {}
          food.productVariant = self.getTextForLang(fbInfo.productionVariantDescription, lang)

          var aInfo = fbInfo.foodAndBeverageAllergyRelatedInformation
          if (aInfo) {
            var allergens = aInfo.foodAndBeverageAllergen
            
            var may_contain = {levelOfContainment: 'MayContain', allergenList: []}
            var contains = {levelOfContainment: 'Contains', allergenList: []}

            allergens.forEach(function (allergen) {

              if (allergen.levelOfContainment == 'MAY_CONTAIN') {
                may_contain.allergenList.push(self.getAllergen(allergen.allergenTypeCode))
              }
              else if (allergen.levelOfContainment == 'CONTAINS') {
                contains.allergenList.push(self.getAllergen(allergen.allergenTypeCode))
              }
            })
            food.allergens = [contains, may_contain]
          }

          var dietCodes = fbInfo.foodAndBeverageDietRelatedInformation
          if (dietCodes) {
            dietCodes.forEach(function (e) {
              if (e.foodAndBeverageDietTypeInformation) {
                if (!food.diet) food.diet = []
                food.diet.push(self.getText(e.foodAndBeverageDietTypeInformation.dietTypeCode))
              }
            })
          }

          var ingInfo = fbInfo.foodAndBeverageIngredientInformation
          if (ingInfo) {
            var ingredients = ingInfo.foodAndBeverageIngredient
            if (ingredients) {
              ingredients.forEach(function (e) {
                if (!e.ingredientName) return
                var ing = self.getTextForLang(e.ingredientName.description, lang)
                if (ing) {
                  if (!food.ingredients) food.ingredients = []
                  food.ingredients.push(self.getText(ing))
                }
              })
            }
            if (ingInfo.ingredientStatement) {
              food.ingredientStatement = self.getTextForLang(ingInfo.ingredientStatement.description, lang)
            }
          }

          var nutInfoList = fbInfo.foodAndBeverageNutrientInformation
          if (nutInfoList) {
            food.nutrientInformation = nutInfoList.map(function (nInfo) {
              var info = {}
              info.preparationState = self.getText(nInfo.preparationState)
              info.householdServingSize = self.getTextForLang(nInfo.householdServingSize && nInfo.householdServingSize.description, lang)
              info.servingSize = self.getMeasurement(nInfo.servingSize)
              var nutrients = nInfo.foodAndBeverageNutrient
              info.nutrientList = nutrients.map(function (e) {
                var nut = {}
                nut.nutrient = self.getNutrient(e.nutrientTypeCode.iNFOODSCodeValue)
                nut.measurementPrecision = self.getText(e.measurementPrecision)
                nut.percentageOfDailyValueIntake = e.percentageOfDailyValueIntake 
                nut.quantityContained = self.getMeasurement(e.quantityContained)
                return nut
              })
              return info
            })
          }

          var prepInfoList = fbInfo.foodAndBeveragePreparationInformation 
          if (prepInfoList) {
            food.foodAndBeveragePreparationInformation = prepInfoList.map(function (prepInfo) {
              var prep = {}
              prep.preparationType = prepInfo.preparationType
              if (prepInfo.preparationInstructions) {
                prep.preparationInstructions = self.getTextForLang(prepInfo.preparationInstructions.description, lang)
              }
              return prep
            })
          }

          return food

        }) // end fbInfoList.map

      } // end if fbInfoList

      result.transformed_by = 'browser'
      result.transform_millis = Date.now() - start

      return result
    }
}
