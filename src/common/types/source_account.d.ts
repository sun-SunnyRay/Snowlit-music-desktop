declare namespace LX {
  namespace SourceAccount {
    type Id = 'wy' | 'tx' | 'kg'

    interface Status {
      id: Id
      loggedIn: boolean
      userId?: string
      nickname?: string
    }

    type PlaylistKind = 'created' | 'collected' | 'liked' | 'daily' | 'recent'

    interface RemotePlaylist {
      source: Id
      id: string
      name: string
      cover?: string
      trackCount?: number
      kind: PlaylistKind
    }
  }
}
