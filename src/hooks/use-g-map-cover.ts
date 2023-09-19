import pin19be6b from '/@/assets/icons/pin-19be6b.svg'
import pin212121 from '/@/assets/icons/pin-212121.svg'
import pin2d8cf0 from '/@/assets/icons/pin-2d8cf0.svg'
import pinb620e0 from '/@/assets/icons/pin-b620e0.svg'
import pine23c39 from '/@/assets/icons/pin-e23c39.svg'
import pineffbb00 from '/@/assets/icons/pin-ffbb00.svg'
import { getRoot } from '/@/root'
import rootStore from '/@/store'
import { GeojsonCoordinate } from '/@/types/map'
import { useCommon } from './use/common'
import {
  updateElementsReq,
} from '/@/api/layer'
const { getKeylayer, updateCoordinates, getElementGroups } = useCommon()
const store = rootStore
export function useGMapCover () {
  const root = getRoot()
  const AMap = root.$aMap

  const normalColor = '#2D8CF0'

  const coverList = store.state.coverList

  function AddCoverToMap (cover :any) {
    root.$map.add(cover)
    coverList.push(cover)
    // console.log('coverList:', store.state.coverList)
  }
  // 调整矢量图
  async function updataElement (position:[], id:any) {
    console.log(position, 'position---')
    const selectedLayer = getKeylayer(id)
    selectedLayer.resource.content.geometry.coordinates = position
    updateCoordinates('gcj02-wgs84', selectedLayer)
    console.log(selectedLayer.resource.content, 'selectedLayer.resource.content')
    const result = await updateElementsReq(id, {
      name: selectedLayer.name,
      content: selectedLayer.resource.content
    })
    getElementGroups()
  }
  function getPinIcon (color?:string) {
    // console.log('color', color)
    const colorObj: {
      [key: number| string]: any
    } = {
      '2d8cf0': pin2d8cf0,
      '19be6b': pin19be6b,
      212121: pin212121,
      b620e0: pinb620e0,
      e23c39: pine23c39,
      ffbb00: pineffbb00,
    }
    const iconName = (color?.replaceAll('#', '') || '').toLocaleLowerCase()
    return new AMap.Icon({
      // size: new AMap.Size(40, 50),
      image: colorObj[iconName],
      // imageOffset: new AMap.Pixel(0, -60),
      // imageSize: new AMap.Size(40, 50)
    })
  }

  function init2DPin (name: string, coordinates:GeojsonCoordinate, color?:string, data?:{}) {
    console.log(name, coordinates[0], coordinates[1], color, data)
    const pin = new AMap.Marker({
      position: new AMap.LngLat(coordinates[0], coordinates[1]),
      title: name,
      icon: getPinIcon(color),
      // strokeColor: color || normalColor,
      // fillColor: color || normalColor,
      extData: data
    })
    // 点击触发
    pin.on('click', function (e) {
      store.commit('SET_LAYER_ID', data.id)
      const infoWindow = new AMap.InfoWindow({
        content: data.name,
        offset: new AMap.Pixel(0, -10) // 左上角
      })
      root.$map.setFitView([pin])
      infoWindow.open(root.$map, [coordinates[0], coordinates[1]])
    })
    // console.log('coordinates pin', pin)
    AddCoverToMap(pin)
  }

  function initCircle (name: string, coordinates:GeojsonCoordinate, color?:string, data?:{}) {
    // 创建圆形 Circle实例
    const circle = new AMap.Circle({
      center: [coordinates[0], coordinates[1]],
      radius: coordinates[2],
      strokeColor: color || normalColor,
      strokeOpacity: 1,
      strokeWeight: 2,
      borderWeight: 3,
      fillOpacity: 0.4,
      strokeDasharray: [10, 10],
      // 线样式还支持 'dashed'
      fillColor: color,
      zIndex: 50,
    })
    // 点击触发
    const circleEditor = new AMap.CircleEditor(root.$map, circle)
    circle.on('click', function (e) {
      store.commit('SET_LAYER_ID', data.id)
      circleEditor.open()
    })
    circleEditor.on('adjust', async function (event) {
      // store.commit('SET_LAYER_ID', layerId)
      const obj = event.target
      const position = [obj.getCenter().lng, obj.getCenter().lat, obj.getRadius()]
      updataElement(position, data.id)
    })
    AddCoverToMap(circle)
  }

  function AddOverlayGroup (overlayGroup) {
    root.$map.add(overlayGroup)
    coverList.push(overlayGroup)
  }
  function initPolyline (name: string, coordinates:GeojsonCoordinate[], color?:string, data?:{}) {
    const path = [] as GeojsonCoordinate[]
    coordinates.forEach(coordinate => {
      path.push(new AMap.LngLat(coordinate[0], coordinate[1]))
    })
    const polyline = new AMap.Polyline({
      path: path,
      strokeColor: color || normalColor,
      strokeOpacity: 1,
      strokeWeight: 2,
      strokeStyle: 'solid',
      extData: data
      // draggable: true,
    })

    // 计算线段长度距离
    const p1 = coordinates[0]
    const p2 = coordinates[1]
    // 返回 p1 到 p2 间的地面距离，单位：米
    const dis = AMap.GeometryUtil.distance(p1, p2).toFixed(1)
    // console.log(dis)
    store.state.Layers.forEach(item => {
      item.elements.forEach(item2 => {
        if (item2.id === data.id) {
          item2.around = dis
        }
      })
    })
    const polylineEditor = new AMap.PolylineEditor(root.$map, polyline)
    // 点击触发
    polyline.on('click', function (e) {
      store.commit('SET_LAYER_ID', data.id)
      const infoWindow = new AMap.InfoWindow({
        content: '<div>' + '名称：' + data.name + '</div>' + '直线距离：' + dis + 'm',
        offset: new AMap.Pixel(0, -10) // 左上角
      })
      root.$map.setFitView([polyline])
      infoWindow.open(root.$map, [coordinates[0][0], coordinates[0][1]])
      polylineEditor.open()
    })
    polylineEditor.on('adjust', async function (event) {
      // store.commit('SET_LAYER_ID', layerId)
      const obj = event.target
      const position = obj._opts.path
      updataElement(position, data.id)
    }) 
    AddOverlayGroup(polyline)
  }

  function initPolygon (name: string, coordinates:GeojsonCoordinate[], color?:string, data?:{}) {
    const path = [] as GeojsonCoordinate[]
    coordinates.forEach(coordinate => {
      path.push(new AMap.LngLat(coordinate[0], coordinate[1]))
    })
    // console.log('Polygon', path)
    const Polygon = new AMap.Polygon({
      path: path,
      area: 'lizhao',
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: color || normalColor,
      fillOpacity: 0.4,
      // draggable: true,
      strokeColor: color || normalColor,
      extData: data
    })
    // 计算多边形面积
    const area = Math.round(AMap.GeometryUtil.ringArea(coordinates))
    // 计算多边形周长 返回线段 p0-p1-p2 的实际长度，单位：米
    const aroundList = coordinates
    aroundList.push(coordinates[0])
    const around = AMap.GeometryUtil.distanceOfLine(aroundList).toFixed(1)
    // console.log(around)
    const polygonEditor = new AMap.PolygonEditor(root.$map, Polygon)
    // 点击触发
    Polygon.on('click', function (e) {
      // console.log(coordinates)
      store.commit('SET_LAYER_ID', data.id)
      polygonEditor.open()
    })
    polygonEditor.on('adjust', async function (event) {
      // store.commit('SET_LAYER_ID', layerId)
      const obj = event.target
      const position = obj._opts.path
      updataElement([position], data.id)
    })
    // 鼠标移入
    const infoWindow = new AMap.InfoWindow({
      content: '<div>' + '名称：' + data.name + '</div>' + '<div>' + '水平面积：' + area + 'm²' + '</div>' + '水平周长：' + around + 'm',
      offset: new AMap.Pixel(0, -10) // 左上角
    })
    root.$map.setFitView([Polygon])
    Polygon.on('mouseover', function (e) {
      infoWindow.open(root.$map, [coordinates[0][0], coordinates[0][1]])
    })
    // 鼠标移出
    Polygon.on('mouseout', function (e) {
      infoWindow.close()
    })
    // console.log(store.state.Layers)
    store.state.Layers.forEach(item => {
      item.elements.forEach(item2 => {
        if (item2.id === data.id) {
          item2.area = area
          item2.around = around
        }
      })
    })
    AddOverlayGroup(Polygon)
  }

  function removeCoverFromMap (id:string) {
    for (let i = 0; i < coverList.length; i++) {
      const ele = coverList[i]
      // console.log(ele)
      const extdata = ele?.getExtData()
      if (extdata?.id === id) {
        console.log(extdata)
        root.$map.remove(ele)
        coverList.slice(i, 1)
        break
      }
    }
  }

  function getElementFromMap (id:string) {
    // console.log('start', new Date().getTime())
    const ele = coverList.find(ele => ele?.getExtData().id === id)
    // console.log('end', new Date().getTime())
    return ele
    // coverList.forEach((ele:any) => {
    //   const extdata = ele?.getExtData()
    //   // console.log(extdata)
    //   if (extdata?.id === id) {
    //     return ele
    //   }
    // })
  }

  function getEditorElementFromMap (id:string) {
    const ele = getElementFromMap(id)
    console.log('circleEditor->>', ele)
    root.$map.setFitView([ele])
    const circleEditor = new AMap.PolygonEditor(root.$map, ele)
    circleEditor.on('move', function (event) {
      console.log('触发事件：move')
    })

    circleEditor.on('adjust', function (event) {
      console.log('触发事件：adjust')
    })

    circleEditor.on('end', function (event) {
      console.log('触发事件： end')
      // event.target 即为编辑后的圆形对象
    })
    circleEditor.open()
    // coverList.forEach((ele:any) => {
    //   const extdata = ele?.getExtData()
    //   // console.log(extdata)
    //   if (extdata?.id === id) {
    //     return ele
    //   }
    // })
  }

  function updatePinElement (id:string, name: string, coordinates:GeojsonCoordinate, color?:string) {
    const element = getElementFromMap(id) as any
    if (element) {
      const icon = getPinIcon(color)
      element.setPosition(new AMap.LngLat(coordinates[0], coordinates[1]))
      element.setIcon(icon)
      element.setTitle(name)
    } else {
      // console.log('into init PIN')
      init2DPin(name, coordinates, color, {
        id: id,
        name: name
      })
    }
  }

  function calculateDistance (lat1:number, lon1:number, lat2:number, lon2:number) :number {
    const p1 = [lat1, lon1]
    const p2 = [lat2, lon2]
    // 返回 p1 到 p2 间的地面距离，单位：米
    return root.$aMap.GeometryUtil.distance(p1, p2)
  }

  function ringArea (coordinates:GeojsonCoordinate[]) :number {
    return root.$aMap.GeometryUtil.ringArea(coordinates)
  }

  return {
    init2DPin,
    initPolyline,
    initPolygon,
    initCircle,
    removeCoverFromMap,
    getElementFromMap,
    getEditorElementFromMap,
    updatePinElement,
    calculateDistance,
    ringArea
  }
}
