type VimeoOEmbedResponse = {
  html: string
  title?: string
  thumbnail_url?: string
}

export async function getVimeoOEmbed(url: string) {
  const endpoint = new URL('https://vimeo.com/api/oembed.json')
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('responsive', 'true')
  endpoint.searchParams.set('title', 'false')
  endpoint.searchParams.set('byline', 'false')
  endpoint.searchParams.set('portrait', 'false')

  const response = await fetch(endpoint.toString(), {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to load Vimeo embed (${response.status})`)
  }

  return response.json() as Promise<VimeoOEmbedResponse>
}
