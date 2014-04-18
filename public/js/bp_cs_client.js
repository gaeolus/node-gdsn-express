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
      if (code == '124') return 'Canada'
      if (code == '840') return 'United States'
      return code
    }
  , getNutrient: function (code) {
      if (code == 'ENER')   return 'Calories'
      if (code == 'ENER-')  return 'Calories'
      if (code == 'ENERPF') return 'Calories from Fat'
      if (code == 'BIOT')   return 'Biotin'
      if (code == 'NA')     return 'Sodium'
      if (code == 'CHO-')   return 'Total Carbohydrate'
      if (code == 'CHOL-')  return 'Cholesterol'
      if (code == 'K')      return 'Potassium'
      if (code == 'PRO-')   return 'Protein'
      if (code == 'FAT')    return 'Total Fat'
      if (code == 'FASAT')  return 'Saturated Fat'
      if (code == 'FATRN')  return 'Trans Fat'
      if (code == 'FAPU')   return 'Polyunsaturated Fat'
      if (code == 'FAMS')   return 'Monounsaturated Fat'
      if (code == 'SUGAR')  return 'Sugar'
      if (code == 'FIB-')   return 'Fiber'
      if (code == 'FIBTG')  return 'Fiber'
      if (code == 'VITA-')  return 'Vitamin A'
      if (code == 'VITC')   return 'Vitamin C'
      if (code == 'CA')     return 'Calcium'
      if (code == 'FE')     return 'Iron'
      if (code == 'VITD-')  return 'Vitamin D'
      if (code == 'VITE-')  return 'Vitamin E'
      if (code == 'VITK')   return 'Vitamin K'
      if (code == 'THIA')   return 'Thiamin'
      if (code == 'RIBF')   return 'Riboflavin'
      if (code == 'NIAEQ')  return 'Niacin'
      if (code == 'VITB6-') return 'Vitamin B6'
      if (code == 'FOL')    return 'Folate'
      if (code == 'VITB12') return 'Vitamin B12'
      if (code == 'PANTAC') return 'Pantothenic Acid'
      if (code == 'P')      return 'Phosphorus'
      if (code == 'ID')     return 'Iodine'
      if (code == 'MG')     return 'Magnesium'
      if (code == 'ZN')     return 'Zinc'
      if (code == 'SE')     return 'Selenium'
      if (code == 'CU')     return 'Copper'
      if (code == 'MN')     return 'Manganese'
      if (code == 'CR')     return 'Chromium'
      if (code == 'MO')     return 'Molybdenum'
      if (code == 'CLD')    return 'Chloride'
      return code
    }
  , getAllergen: function (code) {
      if (code == 'AC') return 'Crustacean'
      if (code == 'AE') return 'Eggs'
      if (code == 'AF') return 'Fish'
      if (code == 'AM') return 'Milk'
      if (code == 'AN') return 'Tree Nuts'
      if (code == 'AP') return 'Peanuts'
      if (code == 'AS') return 'Sesame'
      if (code == 'AX') return 'Gluten'
      if (code == 'AY') return 'Soybean'
      if (code == 'UM') return 'Shellfish'
      if (code == 'UW') return 'Wheat'
      return code
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
  , transform: function (item) {

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
          result.productName           = self.getTextForLang(tiDesc.tradeItemDescription)
          result.additionalDescription = self.getTextForLang(tiDesc.additionalTradeItemDescription)
          result.shortDescription      = self.getTextForLang(tiDesc.descriptionShort && tiDesc.descriptionShort.description)
          result.functionalName        = self.getTextForLang(tiDesc.functionalName && tiDesc.functionalName.description)
        }
        
        var tiNeutral              = tiInfo.tradingPartnerNeutralTradeItemInformation
        if (tiNeutral) {
          if (tiNeutral.tradeItemCountryOfOrigin) {
            result.countryOfOrigin = self.getCountry(tiNeutral.tradeItemCountryOfOrigin.countryISOCode)
          }
          if (tiNeutral.brandOwnerOfTradeItem) {
            result.brandOwner = tiNeutral.brandOwnerOfTradeItem.nameOfBrandOwner
          }
          if (tiNeutral.manufacturerOfTradeItem) {
            result.manufacturer = tiNeutral.manufacturerOfTradeItem.nameOfManufacturer
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
            result.marketingMessage = self.getTextForLang(tiNeutral.marketingInformation.tradeItemMarketingMessage, 'en')
          }

        } // end tiNeutral
      } // end tiInfo

      var food_ext = orig.extension && orig.extension.foodAndBeverageTradeItemExtension

      var extInfo = food_ext && food_ext.tradeItemExternalInformation
      if (extInfo) {
        result.images = extInfo.map(function (e) {
          return e.uniformResourceIdentifier
        })
      }

      var mktInfo = food_ext && food_ext.foodAndBeverageMarketingInformationExtension
      if (mktInfo) {
        if (mktInfo.servingSuggestion) {
          result.servingSuggestion = self.getTextForLang(mktInfo.servingSuggestion, 'en')
        }
      }

      var fbInfoList = food_ext && food_ext.foodAndBeverageInformation
      if (fbInfoList) {

        result.foodAndBeverageInformation = fbInfoList.map(function (fbInfo) {

          var food = {}
          food.productVariant = self.getTextForLang(fbInfo.productionVariantDescription, 'en')

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
                var ing = self.getTextForLang(e.ingredientName.description, 'en')
                if (ing) {
                  if (!food.ingredients) food.ingredients = []
                  food.ingredients.push(self.getText(ing))
                }
              })
            }
            if (ingInfo.ingredientStatement) {
              food.ingredientStatement = self.getTextForLang(ingInfo.ingredientStatement.description, 'en')
            }
          }

          var nutInfoList = fbInfo.foodAndBeverageNutrientInformation
          if (nutInfoList) {
            food.nutrientInformation = nutInfoList.map(function (nInfo) {
              var info = {}
              info.preparationState = self.getText(nInfo.preparationState)
              info.householdServingSize = self.getTextForLang(nInfo.householdServingSize && nInfo.householdServingSize.description, 'en')
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
                prep.preparationInstructions = self.getTextForLang(prepInfo.preparationInstructions.description, 'en')
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
