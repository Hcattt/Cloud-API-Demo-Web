import rootStore from '/@/store'
import { GeojsonCoordinate } from '/@/types/map'
import { MapDoodleType, MapElementEnum } from '/@/constants/map'
import { gcj02towgs84, wgs84togcj02 } from '/@/vendors/coordtransform'
import {getElementGroupsReq} from '/@/api/layer'
const store = rootStore
export function useCommon () {
  // 获取选中的矢量图
  function getKeylayer (id:string) {
    store?.dispatch('getAllElement')
    const Layers = store?.state.Layers
    let layer = null
    const findCan = function (V) {
      V.forEach((item:any) => {
        if (item.id === id) {
          layer = item
        }
        if (item.elements) {
          findCan(item.elements)
        }
      })
    }
    findCan(Layers)
    return layer
  }
  // wgs84和jci02的转换
  function updateCoordinates (transformType: string, element: any) {
    const geoType = element.resource?.content.geometry.type
    const type = element.resource?.type as number
    if (element.resource) {
      if (MapElementEnum.PIN === type) {
        const coordinates = element.resource?.content.geometry
          .coordinates as GeojsonCoordinate
        if (transformType === 'wgs84-gcj02') {
          const transResult = wgs84togcj02(
            coordinates[0],
            coordinates[1]
          ) as GeojsonCoordinate
          element.resource.content.geometry.coordinates = transResult
        } else if (transformType === 'gcj02-wgs84') {
          const transResult = gcj02towgs84(
            coordinates[0],
            coordinates[1]
          ) as GeojsonCoordinate
          element.resource.content.geometry.coordinates = transResult
        }
      } else if (MapElementEnum.LINE === type && geoType === 'LineString') {
        const coordinates = element.resource?.content.geometry
          .coordinates as GeojsonCoordinate[]
        if (transformType === 'wgs84-gcj02') {
          coordinates.forEach(coordinate => {
            coordinate = wgs84togcj02(
              coordinate[0],
              coordinate[1]
            ) as GeojsonCoordinate
          })
        } else if (transformType === 'gcj02-wgs84') {
          coordinates.forEach(coordinate => {
            coordinate = gcj02towgs84(
              coordinate[0],
              coordinate[1]
            ) as GeojsonCoordinate
          })
        }
        element.resource.content.geometry.coordinates = coordinates
      } else if (MapElementEnum.POLY === type && geoType === 'Polygon') {
        const coordinates = element.resource?.content.geometry
          .coordinates[0] as GeojsonCoordinate[]

        if (transformType === 'wgs84-gcj02') {
          coordinates.forEach((coordinate, index:number) => {
            coordinates[index] = wgs84togcj02(
              coordinate[0],
              coordinate[1]
            ) as GeojsonCoordinate
          })
        } else if (transformType === 'gcj02-wgs84') {
          coordinates.forEach((coordinate, index:number) => {
            coordinates[index] = gcj02towgs84(
              coordinate[0],
              coordinate[1]
            ) as GeojsonCoordinate
          })
        }
        element.resource.content.geometry.coordinates = [coordinates]
      } else if (MapElementEnum.CIR === type && geoType === 'Circle') {
        let position = element.resource?.content.geometry
          .coordinates
        // 半径
        const radius = position[2]
        if (transformType === 'wgs84-gcj02') {
          position = wgs84togcj02(
            position[0],
            position[1]
          ) as GeojsonCoordinate
        } else if (transformType === 'gcj02-wgs84') {
          position = gcj02towgs84(
            position[0],
            position[1]
          ) as GeojsonCoordinate
        }
        element.resource.content.geometry.coordinates = [...position, radius]
      }
    }
  }
//   更新矢量图
  async function getElementGroups (type?: string) {
    const result = await getElementGroupsReq({
      groupId: '',
      isDistributed: true
    })
    const mapLayers = result.data
    mapLayers.forEach(item => {
        if (item.elements) {
            item.elements.forEach(ele => {
                updateCoordinates('wgs84-gcj02', ele)
            })
        }
    })
    store?.commit('SET_LAYER_INFO', mapLayers.value)
  }
  return {
    getKeylayer,
    updateCoordinates,
    getElementGroups
  }
}
