
import { Formik, Form, Field } from 'formik'
import { X, AlertTriangle, Pencil } from 'lucide-react'

import { Button } from './ui/button'
import { Input } from './ui/input'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

import {
  circuitNameSchema,
  type CircuitNameValues,
} from '../validation/circuitSchema'

import type { Circuit } from '../api/circuits'

interface BaseProps {
  circuit: Circuit
  open: boolean
  loading: boolean
  error: string
  onClose: () => void
  onConfirmDelete: () => void
}

type CircuitModalProps =
  | (BaseProps & {
      mode: 'rename'
      onRename: (name: string) => void
    })
  | (BaseProps & {
      mode: 'delete'
    })

function validateName(values: CircuitNameValues) {
  const result = circuitNameSchema.safeParse(values)

  if (result.success) return {}

  return result.error.issues.reduce<Record<string, string>>(
    (errors, issue) => {
      const field = issue.path[0]

      if (field === 'name') {
        errors.name = issue.message
      }

      return errors
    },
    {},
  )
}

export function CircuitModal(props: CircuitModalProps) {
  const isRename = props.mode === 'rename'

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open && !props.loading) props.onClose()
      }}
    >
      <DialogContent className="max-w-md border-[#dfe5e1] bg-white p-6">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ef] text-[#176b4b]">
            {isRename ? (
              <Pencil className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </div>

          <DialogTitle className="text-xl text-[#26332d]">
            {isRename ? 'Rename circuit' : 'Delete circuit'}
          </DialogTitle>

          <DialogDescription className="text-[#829087]">
            {isRename
              ? 'Choose a new name for your circuit.'
              : 'This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        {isRename ? (
          <Formik<CircuitNameValues>
            initialValues={{ name: props.circuit.name }}
            validate={validateName}
            onSubmit={(values) => {
              const name = circuitNameSchema.parse(values).name
              props.onRename(name)
            }}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="mt-3 space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="circuit-name"
                    className="text-sm font-medium text-[#354239]"
                  >
                    Circuit name
                  </label>

                  <Field name="name">
                    {({ field }: { field: React.InputHTMLAttributes<HTMLInputElement> }) => (
                      <Input
                        {...field}
                        id="circuit-name"
                        placeholder="Enter circuit name"
                        maxLength={60}
                        autoFocus
                        disabled={props.loading}
                        className="h-10 border-[#dfe5e1] bg-[#f8faf9] focus-visible:border-[#176b4b] focus-visible:ring-[#176b4b]/20"
                      />
                    )}
                  </Field>

                  {touched.name && errors.name && (
                    <p className="text-xs text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                {props.error && (
                  <p role="alert" className="text-sm text-red-600">
                    {props.error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={props.onClose}
                    disabled={props.loading}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={props.loading || isSubmitting}
                    className="bg-[#176b4b] text-white hover:bg-[#12583d]"
                  >
                    {props.loading ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="mt-3 space-y-5">
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Are you sure you want to delete "{props.circuit.name}"?
              </p>
              <p className="mt-1 text-sm text-red-700/80">
                Your circuit will be permanently deleted.
              </p>
            </div>

            {props.error && (
              <p role="alert" className="text-sm text-red-600">
                {props.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={props.onClose}
                disabled={props.loading}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={props.onConfirmDelete}
                disabled={props.loading}
              >
                {props.loading ? 'Deleting...' : 'Delete circuit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
