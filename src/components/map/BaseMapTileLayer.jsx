import React, { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { TileLayer } from 'react-leaflet'
import './leaflet-overrides.css'

const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || '3000'
const DEFAULT_API_ORIGIN = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`
  : `http://127.0.0.1:${DEFAULT_API_PORT}`
const API_ORIGIN = (import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN).replace(/\/$/, '')

const TILE_PROVIDERS = [
  {
    key: 'backend-tile-proxy',
    url: `${API_ORIGIN}/api/map-tiles/{z}/{x}/{y}`,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO &copy; Esri',
    maxZoom: 19,
    subdomains: 'abc',
  },
  {
    key: 'osm-direct',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
]

export default function BaseMapTileLayer(props) {
  const [providerIndex, setProviderIndex] = useState(0)
  const switchedRef = useRef(false)
  const allFailedRef = useRef(false)

  useEffect(() => {
    switchedRef.current = false
  }, [providerIndex])

  const provider = TILE_PROVIDERS[providerIndex]

  const handleTileError = () => {
    if (switchedRef.current) return

    if (providerIndex >= TILE_PROVIDERS.length - 1) {
      if (!allFailedRef.current) {
        console.error('All configured tile providers failed to load.')
        allFailedRef.current = true
      }
      return
    }

    switchedRef.current = true
    const nextProvider = TILE_PROVIDERS[providerIndex + 1]
    console.warn(`Tile provider "${provider.key}" failed. Switching to "${nextProvider.key}".`)
    setProviderIndex((current) => Math.min(current + 1, TILE_PROVIDERS.length - 1))
  }

  return (
    <TileLayer
      key={provider.key}
      url={provider.url}
      attribution={provider.attribution}
      subdomains={provider.subdomains || 'abc'}
      maxZoom={provider.maxZoom}
      eventHandlers={{ tileerror: handleTileError }}
      {...props}
    />
  )
}
