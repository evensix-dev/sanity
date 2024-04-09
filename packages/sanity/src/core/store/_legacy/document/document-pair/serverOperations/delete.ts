import {type OperationImpl} from '../operations/types'

export const del: OperationImpl<[], 'NOTHING_TO_DELETE'> = {
  disabled: ({snapshots}) => (snapshots.draft || snapshots.published ? false : 'NOTHING_TO_DELETE'),
  execute: ({client: globalClient, schema, idPair, typeName}) => {
    const vXClient = globalClient.withConfig({apiVersion: 'X'})

    const {dataset} = globalClient.config()

    return vXClient.observable.request({
      url: `/data/actions/${dataset}`,
      method: 'post',
      tag: 'document.delete',
      // this disables referential integrity for cross-dataset references. we
      // have this set because we warn against deletes in the `ConfirmDeleteDialog`
      // UI. This operation is run when "delete anyway" is clicked
      query: {skipCrossDatasetReferenceValidation: 'true'},
      body: {
        actions: [
          {
            actionType: 'sanity.action.document.delete',
            draftId: idPair.draftId,
            publishedId: idPair.publishedId,
          },
        ],
      },
    })
  },
}
