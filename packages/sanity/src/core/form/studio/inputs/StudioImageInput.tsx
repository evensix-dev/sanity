import imageUrlBuilder from '@sanity/image-url'
import {type SchemaType} from '@sanity/types'
import {useCallback, useMemo} from 'react'

import {useClient} from '../../../hooks/useClient'
import {useTranslation} from '../../../i18n'
import {useDocumentPreviewStore} from '../../../store/_legacy/datastores'
import {DEFAULT_STUDIO_CLIENT_OPTIONS} from '../../../studioClient'
import {BaseImageInput, type BaseImageInputProps} from '../../inputs/files/ImageInput'
import {useFormBuilder} from '../../useFormBuilder'
import {resolveUploader as defaultResolveUploader} from '../uploads/resolveUploader'
import {type FileLike} from '../uploads/types'
import {observeImageAsset} from './client-adapters/assets'

/**
 * @hidden
 * @beta */
export type ImageInputProps = Omit<
  BaseImageInputProps,
  | 'assetSources'
  | 'directUploads'
  | 'imageUrlBuilder'
  | 'observeAsset'
  | 'client'
  | 'resolveUploader'
>

/**
 * @hidden
 * @beta */
export function StudioImageInput(props: ImageInputProps) {
  const sourcesFromSchema = props.schemaType.options?.sources
  const {image} = useFormBuilder().__internal
  const documentPreviewStore = useDocumentPreviewStore()
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const supportsImageUploads = image.directUploads

  const resolveUploader = useCallback(
    (type: SchemaType, file: FileLike) => {
      if (!supportsImageUploads) {
        return null
      }
      return defaultResolveUploader(type, file)
    },
    [supportsImageUploads],
  )

  // note: type.options.sources may be an empty array and in that case we're
  // disabling selecting images from asset source  (it's a feature, not a bug)
  const assetSources = useMemo(
    () => sourcesFromSchema || image.assetSources,
    [image, sourcesFromSchema],
  )

  const builder = useMemo(() => imageUrlBuilder(client), [client])

  const observeAsset = useCallback(
    (id: string) => observeImageAsset(documentPreviewStore, id),
    [documentPreviewStore],
  )

  const {t} = useTranslation()
  return (
    <BaseImageInput
      {...props}
      t={t}
      client={client}
      assetSources={assetSources}
      directUploads={supportsImageUploads}
      imageUrlBuilder={builder}
      observeAsset={observeAsset}
      resolveUploader={resolveUploader}
    />
  )
}
