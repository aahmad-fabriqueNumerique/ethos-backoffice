import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // Récupérer l'URL de l'image à partir des paramètres de requête
    const query = getQuery(event)
    const imageUrl = query.url as string

    if (!imageUrl) {
      return new Response('URL d\'image requise', { status: 400 })
    }

    // Récupérer l'image depuis l'URL externe
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      return new Response(`Erreur lors de la récupération de l'image: ${response.status}`, { 
        status: response.status 
      })
    }

    // Récupérer le type de contenu et les données binaires
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    // Renvoyer l'image avec les bons en-têtes
    return new Response(buffer, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400' // Cache pour 24 heures
      }
    })
  } catch (error) {
    console.error('Erreur dans le proxy d\'image:', error)
    return new Response('Erreur serveur', { status: 500 })
  }
})
